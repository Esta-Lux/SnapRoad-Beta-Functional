import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: Props) {
  const { colors, shadow: themeShadow } = useTheme();
  return (
    <View
      style={[
        styles.card,
        themeShadow(10),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
