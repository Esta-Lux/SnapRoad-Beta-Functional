import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title: string;
  subtitle: string;
  /** When omitted, the add affordance is hidden (e.g. Family preview tab). */
  onAddPress?: () => void;
  accentColor: string;
  textColor: string;
  subColor: string;
};

export function SocialScreenHeader({ title, subtitle, onAddPress, accentColor, textColor, subColor }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>
      </View>
      {onAddPress ? (
        <TouchableOpacity
          onPress={onAddPress}
          style={[styles.addBtn, { backgroundColor: `${accentColor}16` }]}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Add or invite a friend"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person-add-outline" size={22} color={accentColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 34 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 5, lineHeight: 20, opacity: 0.92 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
