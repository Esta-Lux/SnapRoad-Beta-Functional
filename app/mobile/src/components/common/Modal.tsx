import React, { useEffect, type ReactNode } from 'react';
import { View, Modal as RNModal, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const SCREEN_H = Dimensions.get('window').height;
const SPRING_CFG = { damping: 28, stiffness: 260, mass: 0.9 };

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ visible, onClose, children }: Props) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, SPRING_CFG);
    } else {
      translateY.value = withTiming(SCREEN_H, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
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
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)' }]}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
              borderTopColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
          {children}
        </Animated.View>
      </View>
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
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
