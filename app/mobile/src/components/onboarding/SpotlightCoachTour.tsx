import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

export const SPOTLIGHT_COACH_STORAGE_KEY = 'snaproad_coach_tour_done';

export type SpotlightStep = {
  id: string;
  targetId: string;
  title: string;
  body: string;
  /** Extra padding around measured layout (px). */
  spotlightPadding?: number;
};

export const SPOTLIGHT_COACH_STEPS: SpotlightStep[] = [
  {
    id: 'tabs-drive',
    targetId: 'tab.map',
    title: 'Home base',
    body: 'The Drive tab is your live map — search, navigate, and see offers around you.',
    spotlightPadding: 10,
  },
  {
    id: 'orion',
    targetId: 'map.orionFab',
    title: 'Ask Orion',
    body: 'Tap the mic for hands-free help — navigation, stops, and quick driving tips.',
    spotlightPadding: 12,
  },
];

type SpotlightTourContextValue = {
  visible: boolean;
  registerLayout: (id: string, layout: LayoutRectangle) => void;
  unregisterTarget: (id: string) => void;
};

const SpotlightTourContext = createContext<SpotlightTourContextValue | null>(null);

export function useSpotlightTourOptional(): SpotlightTourContextValue | null {
  return useContext(SpotlightTourContext);
}

type ProviderProps = {
  children: React.ReactNode;
  visible: boolean;
  onComplete: () => void;
};

export function SpotlightTourProvider({ children, visible, onComplete }: ProviderProps) {
  const layoutsRef = useRef<Record<string, LayoutRectangle>>({});
  const [, setLayoutEpoch] = useState(0);
  const registerLayout = useCallback((id: string, layout: LayoutRectangle) => {
    const prev = layoutsRef.current[id];
    if (
      prev
      && Math.abs(prev.x - layout.x) < 0.5
      && Math.abs(prev.y - layout.y) < 0.5
      && Math.abs(prev.width - layout.width) < 0.5
      && Math.abs(prev.height - layout.height) < 0.5
    ) {
      return;
    }
    layoutsRef.current[id] = layout;
    setLayoutEpoch((n) => n + 1);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    delete layoutsRef.current[id];
    setLayoutEpoch((n) => n + 1);
  }, []);

  const value = useMemo<SpotlightTourContextValue>(
    () => ({
      visible,
      registerLayout,
      unregisterTarget,
    }),
    [visible, registerLayout, unregisterTarget],
  );

  return (
    <SpotlightTourContext.Provider value={value}>
      {children}
      <SpotlightTourOverlay visible={visible} onComplete={onComplete} layoutsRef={layoutsRef} />
    </SpotlightTourContext.Provider>
  );
}

type OverlayProps = {
  visible: boolean;
  onComplete: () => void;
  layoutsRef: React.MutableRefObject<Record<string, LayoutRectangle>>;
};

function SpotlightTourOverlay({ visible, onComplete, layoutsRef }: OverlayProps) {
  const maskUniqueId = useId().replace(/:/g, '');
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [win, setWin] = useState(() => Dimensions.get('window'));
  const total = SPOTLIGHT_COACH_STEPS.length;
  const step = SPOTLIGHT_COACH_STEPS[stepIndex] ?? SPOTLIGHT_COACH_STEPS[0];

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWin(window);
    });
    return () => {
      sub.remove();
    };
  }, []);

  const layout = step ? layoutsRef.current[step.targetId] : undefined;
  const pad = step?.spotlightPadding ?? 8;
  const hasLayout = Boolean(layout && layout.width > 2 && layout.height > 2);

  const hole = useMemo(() => {
    if (!layout || !hasLayout) return null;
    return {
      x: Math.max(0, layout.x - pad),
      y: Math.max(0, layout.y - pad),
      w: layout.width + pad * 2,
      h: layout.height + pad * 2,
    };
  }, [layout, hasLayout, pad]);

  const tooltipAbove = hole ? hole.y + hole.h / 2 > win.height * 0.55 : false;

  const goNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex >= total - 1) {
      onComplete();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, total - 1));
  }, [stepIndex, total, onComplete]);

  const skip = useCallback(() => {
    void Haptics.selectionAsync();
    onComplete();
  }, [onComplete]);

  if (!visible) {
    return null;
  }

  const W = win.width;
  const H = win.height;
  const maskId = `snaproadSpotlightMask_${maskUniqueId}`;

  const cardBottom = Math.max(insets.bottom + 18, 28);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalRoot} pointerEvents="box-none">
        {/* Dim regions — hole stays touch-transparent for the control underneath */}
        {hole ? (
          <>
            <Pressable
              onPress={goNext}
              style={[styles.abs, { left: 0, right: 0, top: 0, height: hole.y }]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss coach overlay area"
            />
            <Pressable
              onPress={goNext}
              style={[styles.abs, {
                left: 0,
                right: 0,
                top: hole.y + hole.h,
                bottom: 0,
              }]}
            />
            <Pressable
              onPress={goNext}
              style={[styles.abs, {
                left: 0,
                width: hole.x,
                top: hole.y,
                height: hole.h,
              }]}
            />
            <Pressable
              onPress={goNext}
              style={[styles.abs, {
                left: hole.x + hole.w,
                right: 0,
                top: hole.y,
                height: hole.h,
              }]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.holeRing,
                {
                  left: hole.x,
                  top: hole.y,
                  width: hole.w,
                  height: hole.h,
                },
              ]}
            />
          </>
        ) : (
          <Pressable style={[styles.abs, { backgroundColor: 'rgba(0,0,0,0.78)' }]} onPress={goNext} />
        )}

        {/* Soft vignette + rounded cutout (visual only) */}
        {hole ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={W} height={H}>
              <Defs>
                <Mask id={maskId}>
                  <Rect x={0} y={0} width={W} height={H} fill="#ffffff" />
                  <Rect
                    x={hole.x}
                    y={hole.y}
                    width={hole.w}
                    height={hole.h}
                    rx={16}
                    ry={16}
                    fill="#000000"
                  />
                </Mask>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={W}
                height={H}
                fill={isLight ? 'rgba(15,23,42,0.82)' : 'rgba(0,0,0,0.78)'}
                mask={`url(#${maskId})`}
              />
            </Svg>
          </View>
        ) : null}

        {!hasLayout ? (
          <View style={[styles.waiting, { top: insets.top + 12 }]} pointerEvents="none">
            <Text style={[styles.waitingText, { color: '#e2e8f0' }]}>Preparing tour…</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.tooltipWrap,
            tooltipAbove
              ? { top: insets.top + 16, bottom: undefined }
              : { bottom: cardBottom, top: undefined },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.tooltip,
              {
                backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(30,41,59,0.97)',
                borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)',
              },
            ]}
          >
            <Text style={[styles.tooltipTitle, { color: colors.text }]}>
              {step.title}
            </Text>
            <Text style={[styles.tooltipBody, { color: colors.textSecondary }]}>
              {step.body}
            </Text>
            <View style={styles.tooltipFooter}>
              <Text style={[styles.stepCount, { color: colors.textTertiary }]}>
                {stepIndex + 1}
                {' '}
                /
                {' '}
                {total}
              </Text>
              <View style={styles.actions}>
                {stepIndex < total - 1 ? (
                  <Pressable onPress={skip} hitSlop={10} style={styles.skipBtn}>
                    <Text style={[styles.skipTxt, { color: colors.textSecondary }]}>Skip</Text>
                  </Pressable>
                ) : (
                  <View style={{ width: 52 }} />
                )}
                <Pressable
                  onPress={goNext}
                  style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.nextTxt}>
                    {stepIndex >= total - 1 ? 'Got it' : 'Next'}
                  </Text>
                  <Ionicons
                    name={stepIndex >= total - 1 ? 'checkmark' : 'arrow-forward'}
                    size={18}
                    color="#fff"
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type SpotlightTargetProps = ViewProps & {
  id: string;
  children: React.ReactNode;
};

/**
 * Wrap a control that should be highlighted during the coach tour.
 * Must be rendered inside {@link SpotlightTourProvider}.
 */
export function SpotlightTarget({ id, children, style, ...rest }: SpotlightTargetProps) {
  const ctx = useContext(SpotlightTourContext);
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    if (!ctx?.visible) return;
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        ctx.registerLayout(id, { x, y, width, height });
      });
    });
  }, [ctx, id]);

  useEffect(() => {
    if (!ctx?.visible) {
      return;
    }
    measure();
    const t = setInterval(measure, 400);
    return () => {
      clearInterval(t);
      ctx.unregisterTarget(id);
    };
  }, [ctx?.visible, ctx, id, measure]);

  if (!ctx || !ctx.visible) {
    return <>{children}</>;
  }

  return (
    <View
      ref={ref}
      style={style}
      collapsable={false}
      onLayout={measure}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  abs: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  holeRing: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  waiting: {
    position: 'absolute',
    alignSelf: 'center',
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tooltipWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  tooltip: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 18 },
      default: {},
    }),
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  tooltipBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  tooltipFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipTxt: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  nextTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
