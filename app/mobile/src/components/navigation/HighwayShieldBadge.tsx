/**
 * HighwayShieldBadge — renders highway shields (I-95, US-1, SR-202, etc.)
 *
 * Shape varies by network:
 *   - Interstate: blue shield
 *   - US route: white shield with black border
 *   - State route: circle or rectangle (varies)
 *   - Default: rounded rect
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { RoadShield } from '../../navigation/navModel';

interface Props {
  shields: RoadShield[];
  /** Reserved for future theming; chip colors come from {@link shieldStyle}. */
  textColor: string;
  maxShields?: number;
}

function shieldStyle(network: string): {
  bg: string;
  border: string;
  textColor: string;
  shape: 'interstate' | 'us' | 'state' | 'default';
} {
  const n = network.toLowerCase();
  if (n.includes('interstate') || n.includes('us-interstate')) {
    return { bg: '#003DA5', border: '#CC2222', textColor: '#FFFFFF', shape: 'interstate' };
  }
  if (n.includes('us-highway') || n.includes('us-route') || n.startsWith('us-')) {
    return { bg: '#FFFFFF', border: '#000000', textColor: '#000000', shape: 'us' };
  }
  if (n.includes('state') || n.includes('sr-') || n.includes('-state')) {
    return { bg: '#FFFFFF', border: '#006633', textColor: '#000000', shape: 'state' };
  }
  if (n.includes('motorway') || n.includes('autobahn')) {
    return { bg: '#003DA5', border: '#FFFFFF', textColor: '#FFFFFF', shape: 'interstate' };
  }
  return { bg: 'rgba(255,255,255,0.2)', border: 'rgba(255,255,255,0.4)', textColor: '#FFFFFF', shape: 'default' };
}

function ShieldChip({ shield }: { shield: RoadShield }) {
  const img = shield.imageBase64?.trim();
  if (img) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: `data:image/png;base64,${img}` }}
        style={styles.nativeShieldImg}
        resizeMode="contain"
      />
    );
  }

  const s = shieldStyle(shield.network);
  const displayText = shield.displayRef || shield.ref;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: s.bg,
          borderColor: s.border,
          borderRadius: s.shape === 'interstate' ? 3 : s.shape === 'state' ? 10 : 4,
          minWidth: s.shape === 'state' ? 24 : 28,
        },
        s.shape === 'interstate' && styles.interstateShape,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: s.textColor,
            fontSize: displayText.length > 3 ? 9 : 10,
          },
        ]}
        numberOfLines={1}
      >
        {displayText}
      </Text>
    </View>
  );
}

export default React.memo(function HighwayShieldBadge({ shields, textColor: _textColor, maxShields = 2 }: Props) {
  if (!shields.length) return null;

  return (
    <View style={styles.row}>
      {shields.slice(0, maxShields).map((s, i) => (
        <ShieldChip key={`${s.network}-${s.ref}-${i}`} shield={s} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  nativeShieldImg: {
    width: 40,
    height: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interstateShape: {
    borderTopWidth: 2.5,
    borderBottomWidth: 1.5,
  },
  chipText: {
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
