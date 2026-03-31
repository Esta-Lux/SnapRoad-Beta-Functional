import React from 'react';
import { Text, StyleSheet, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({ title, onPress, variant = 'primary', disabled, style, textStyle }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const bg =
    variant === 'danger' ? colors.danger :
    variant === 'secondary' ? colors.surfaceSecondary :
    colors.primary;

  const textColor = variant === 'secondary' ? colors.text : '#fff';

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, animStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  text: { fontSize: 16, fontWeight: '700' },
});
