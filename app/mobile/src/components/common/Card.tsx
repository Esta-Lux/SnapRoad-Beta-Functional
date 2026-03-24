import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}

export default function Card({ children, style, dark = true }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: dark ? '#1e1e2e' : '#fff' }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
