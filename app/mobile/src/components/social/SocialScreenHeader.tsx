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
        <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>{subtitle}</Text>
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
          <Ionicons name="person-add-outline" size={18} color={accentColor} />
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
    gap: 10,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 29 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3, lineHeight: 16, opacity: 0.86 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
