import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../utils/storage';

/**
 * Pre-prompt rationale for the iOS / Android system location dialog.
 *
 * Apple App Store Review Guideline 5.1.1(iv): a custom screen shown *before* the
 * system location alert must not offer dismiss / “Not now” / close actions that
 * delay the native permission request. Only a primary action (Continue) may
 * advance to `requestForegroundPermissionsAsync` / `requestBackgroundPermissionsAsync`.
 *
 * After the user has denied at the OS level, callers may show settings nudges
 * or other UX elsewhere — not here.
 *
 * The presentation API is imperative because call sites live in `useLocation`
 * and `friendLiveShareBackgroundTask`. The provider registers via
 * `__registerLocationRationaleHost`.
 *
 * Persistence: after the user taps Continue once per kind, we skip this sheet on
 * later calls (MMKV). `cancel` is only used for host races, not a user-facing exit.
 */

export type LocationRationaleKind = 'foreground' | 'background';

export type LocationRationaleResult = 'continue' | 'cancel';

const STORAGE_KEYS: Record<LocationRationaleKind, string> = {
  /** v2: compliant pre-prompt (no dismiss before system sheet). */
  foreground: 'snaproad_loc_rationale_fg_v2',
  background: 'snaproad_loc_rationale_bg_v2',
};

type Host = {
  present: (kind: LocationRationaleKind) => Promise<LocationRationaleResult>;
};

let activeHost: Host | null = null;

/** Registered by the Provider; do not call from app code. */
export function __registerLocationRationaleHost(host: Host | null): void {
  activeHost = host;
}

/**
 * Imperatively present the rationale. Resolves with `'continue'` when the user
 * taps Continue, or `'cancel'` only if the host is missing or a new rationale
 * replaces an in-flight one (never from a user-facing dismiss button).
 */
export function presentLocationRationale(
  kind: LocationRationaleKind,
): Promise<LocationRationaleResult> {
  if (Platform.OS === 'web' || !activeHost) {
    return Promise.resolve('continue');
  }
  return activeHost.present(kind);
}

/**
 * Drop-in replacement for `Location.requestForegroundPermissionsAsync()` that
 * shows the rationale modal first (once per device, after Continue) before the system sheet.
 *
 * If the rationale host resolves `'cancel'` (race only), we do not persist the
 * “shown” flag and we do not call the system API, preserving the prior OS state.
 */
export async function requestForegroundLocationWithRationale(): Promise<Location.LocationPermissionResponse> {
  if (Platform.OS === 'web') return Location.requestForegroundPermissionsAsync();

  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return existing;

  const alreadyShown = !!storage.getString(STORAGE_KEYS.foreground);
  if (!alreadyShown) {
    const choice = await presentLocationRationale('foreground');
    if (choice === 'cancel') {
      return existing;
    }
    storage.set(STORAGE_KEYS.foreground, new Date().toISOString());
  }
  return Location.requestForegroundPermissionsAsync();
}

/**
 * Same idea but for "Always Allow" / background updates. Shown right before
 * `Location.requestBackgroundPermissionsAsync()` to satisfy Apple's
 * "explain why" guidance for `NSLocationAlwaysAndWhenInUseUsageDescription`.
 */
export async function requestBackgroundLocationWithRationale(): Promise<Location.LocationPermissionResponse | null> {
  if (Platform.OS === 'web') return null;

  const existing = await Location.getBackgroundPermissionsAsync().catch(() => null);
  if (existing && existing.granted) return existing;

  const alreadyShown = !!storage.getString(STORAGE_KEYS.background);
  if (!alreadyShown) {
    const choice = await presentLocationRationale('background');
    if (choice === 'cancel') return existing;
    storage.set(STORAGE_KEYS.background, new Date().toISOString());
  }
  try {
    return await Location.requestBackgroundPermissionsAsync();
  } catch {
    return existing;
  }
}

/** Test-only: forget the "rationale already shown" flag for a given kind. */
export function __resetLocationRationaleStateForTests(kind?: LocationRationaleKind): void {
  if (kind) {
    storage.delete(STORAGE_KEYS[kind]);
    return;
  }
  storage.delete(STORAGE_KEYS.foreground);
  storage.delete(STORAGE_KEYS.background);
}

// ── Provider component ────────────────────────────────────────────────────

type PendingResolve = (result: LocationRationaleResult) => void;

const LOCATION_USE_COPY =
  'SnapRoad uses your location for navigation, road awareness, driving insights, and location sharing when enabled.';

const FOREGROUND_COPY = {
  title: 'Location access',
  body: LOCATION_USE_COPY,
  primaryCta: 'Continue',
};

const BACKGROUND_COPY = {
  title: 'Location in the background',
  body: `${LOCATION_USE_COPY} If the system asks, choose Always so guidance can continue when the screen is off.`,
  primaryCta: 'Continue',
};

export default function LocationPermissionRationaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors, isLight } = useTheme();
  const [kind, setKind] = useState<LocationRationaleKind | null>(null);
  const resolveRef = useRef<PendingResolve | null>(null);

  const present = useCallback((next: LocationRationaleKind) => {
    return new Promise<LocationRationaleResult>((resolve) => {
      // Resolve any in-flight request as a cancel before opening a new one
      // so the caller's promise contract is preserved if multiple call sites
      // race for the modal (e.g. tab switch while map is mounting).
      if (resolveRef.current) {
        const prev = resolveRef.current;
        resolveRef.current = null;
        prev('cancel');
      }
      resolveRef.current = resolve;
      setKind(next);
    });
  }, []);

  useEffect(() => {
    __registerLocationRationaleHost({ present });
    return () => __registerLocationRationaleHost(null);
  }, [present]);

  const close = useCallback((result: LocationRationaleResult) => {
    const r = resolveRef.current;
    resolveRef.current = null;
    setKind(null);
    if (r) r(result);
  }, []);

  const copy = kind === 'background' ? BACKGROUND_COPY : FOREGROUND_COPY;

  return (
    <>
      {children}
      <Modal
        visible={kind !== null}
        transparent
        animationType="fade"
        // Android back: must not dismiss without proceeding to the system prompt (5.1.1(iv)).
        onRequestClose={() => close('continue')}
      >
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                shadowColor: isLight ? '#000' : '#000',
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: kind === 'background' ? '#7C3AED20' : `${colors.primary}20`,
                },
              ]}
            >
              <Ionicons
                name={kind === 'background' ? 'navigate-circle-outline' : 'location-outline'}
                size={32}
                color={kind === 'background' ? '#7C3AED' : colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{copy.body}</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => close('continue')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={copy.primaryCta}
            >
              <Text style={styles.primaryBtnText}>{copy.primaryCta}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
