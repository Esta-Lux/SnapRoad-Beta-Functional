import React, { useEffect, type ReactNode } from 'react';
import {
  View,
  Modal as RNModal,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const SCREEN_H = Dimensions.get('window').height;
const SPRING_CFG = { damping: 28, stiffness: 260, mass: 0.9 };

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When true, dragging the sheet handle down dismisses (Gesture API v2). */
  panDismissible?: boolean;
  /** Top-right X uses the same animated dismiss as backdrop. */
  showCloseButton?: boolean;
  /**
   * When true (default), children are wrapped in a ScrollView for keyboard-safe scrolling.
   * Set false when the sheet already contains a ScrollView, FlatList, or other scroll container.
   */
  scrollable?: boolean;
  /** Added to safe-area top inset for iOS `KeyboardAvoidingView` offset. */
  keyboardOffsetExtra?: number;
}

export default function Modal({
  visible,
  onClose,
  children,
  panDismissible = true,
  showCloseButton = true,
  scrollable = true,
  keyboardOffsetExtra = 0,
}: Props) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const panOffset = useSharedValue(0);

  const kbOffset = keyboardOffsetExtra + (Platform.OS === 'ios' ? insets.top : 0);

  const finishClose = () => {
    panOffset.value = 0;
    onClose();
  };

  const handleBackdropPress = () => {
    translateY.value = withTiming(SCREEN_H, { duration: 220 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(finishClose)();
    });
  };

  useEffect(() => {
    if (visible) {
      panOffset.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, SPRING_CFG);
    } else {
      panOffset.value = 0;
      translateY.value = withTiming(SCREEN_H, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + panOffset.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const pan = Gesture.Pan()
    .enabled(panDismissible)
    .onUpdate((e) => {
      if (e.translationY > 0) panOffset.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 70 || e.velocityY > 420) {
        translateY.value = translateY.value + panOffset.value;
        panOffset.value = 0;
        translateY.value = withTiming(SCREEN_H, { duration: 220 }, () => {
          runOnJS(finishClose)();
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
      } else {
        panOffset.value = withSpring(0, SPRING_CFG);
      }
    });

  return (
    <RNModal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={handleBackdropPress}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={kbOffset}
      >
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)' }]}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        <Animated.View
          needsOffscreenAlphaCompositing={false}
          collapsable={false}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
              borderTopColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              ...(Platform.OS === 'android' ? { elevation: 24 } : {}),
            },
            sheetStyle,
          ]}
        >
          <View style={styles.sheetTopRow}>
            <GestureDetector gesture={pan}>
              <Animated.View style={styles.handleHit}>
                <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
              </Animated.View>
            </GestureDetector>
            {showCloseButton ? (
              <Pressable
                onPress={handleBackdropPress}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { opacity: pressed ? 0.75 : 1, backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 4,
    maxHeight: '85%',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 28,
  },
  handleHit: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 44,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
    maxHeight: SCREEN_H * 0.68,
  },
  sheetScrollContent: {
    flexGrow: 1,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
});
