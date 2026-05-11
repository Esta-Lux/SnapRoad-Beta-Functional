import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../utils/storage';

/**
 * Pre-prompt rationale for the iOS / Android system location dialog.
 *
 * Apple and Google both recommend (and Apple's review guidelines effectively
 * require) that an app explains *why* it needs location **before** the system
 * permission sheet appears. We can't customise the system sheet itself, so we
 * present this lightweight modal and only call
 * `Location.requestForegroundPermissionsAsync()` after the user taps Continue.
 *
 * The presentation API is intentionally imperative because the call sites
 * that need it live deep in non-React modules (`hooks/useLocation`,
 * `location/friendLiveShareBackgroundTask`). The provider component
 * registers itself on mount via `__registerLocationRationaleHost`; the
 * helper functions below resolve to a Promise the caller can await.
 *
 * Persistence: once the modal has been *shown and acknowledged* for a given
 * permission kind, we don't show it again on subsequent calls — repeatedly
 * pre-prompting the same user is annoying. The flags are stored in MMKV.
 */

export type LocationRationaleKind = 'foreground' | 'background';

export type LocationRationaleResult = 'continue' | 'cancel';

const STORAGE_KEYS: Record<LocationRationaleKind, string> = {
  foreground: 'snaproad_loc_rationale_fg_v1',
  background: 'snaproad_loc_rationale_bg_v1',
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
 * Imperatively present the rationale. Resolves once the user taps Continue
 * or Cancel — or `'continue'` immediately if no provider is mounted (so we
 * never block a non-iOS/non-Android build that doesn't need this UX).
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
 * shows the rationale modal first (once per device) before the system sheet.
 *
 * Returns the same shape as the original API so call sites need only swap
 * the function name. If the user cancels the rationale, we synthesise a
 * `denied` response WITHOUT calling the system API — that way the OS-level
 * permission state is preserved and the user can be re-prompted later.
 */
export async function requestForegroundLocationWithRationale(): Promise<Location.LocationPermissionResponse> {
  if (Platform.OS === 'web') return Location.requestForegroundPermissionsAsync();

  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return existing;

  const alreadyShown = !!storage.getString(STORAGE_KEYS.foreground);
  if (!alreadyShown) {
    const choice = await presentLocationRationale('foreground');
    storage.set(STORAGE_KEYS.foreground, new Date().toISOString());
    if (choice === 'cancel') {
      return existing;
    }
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
    storage.set(STORAGE_KEYS.background, new Date().toISOString());
    if (choice === 'cancel') return existing;
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

const FOREGROUND_COPY = {
  title: 'Allow location to navigate',
  body:
    'SnapRoad needs access to your precise location to provide turn-by-turn navigation, calculate ETAs, and snap your position to the road network. Your location is only used during active navigation and is never sold to third parties.',
  primaryCta: 'Continue',
  secondaryCta: "Not now",
};

const BACKGROUND_COPY = {
  title: 'Keep guiding when the screen is off',
  body:
    'For turn-by-turn directions to keep working when SnapRoad is in the background or your phone is locked, allow "Always" location access. We only collect background location during active navigation, never when you\'re not driving.',
  primaryCta: 'Continue',
  secondaryCta: 'Not now',
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
        onRequestClose={() => close('cancel')}
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
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => close('cancel')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={copy.secondaryCta}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                {copy.secondaryCta}
              </Text>
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
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
