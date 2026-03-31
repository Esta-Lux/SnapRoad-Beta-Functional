import React, { useEffect, type ReactNode } from 'react';
import { View, Modal as RNModal, StyleSheet, Pressable, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const SCREEN_H = Dimensions.get('window').height;
const SPRING_CFG = { damping: 28, stiffness: 260, mass: 0.9 };

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When true, dragging the handle down dismisses the sheet (Gesture API v2). */
  panDismissible?: boolean;
}

export default function Modal({ visible, onClose, children, panDismissible = false }: Props) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const panOffset = useSharedValue(0);

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

  const handleBackdropPress = () => {
    translateY.value = withTiming(SCREEN_H, { duration: 220 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  return (
    <RNModal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={handleBackdropPress}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
          {children}
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
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleHit: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
