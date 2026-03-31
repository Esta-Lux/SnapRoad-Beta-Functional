import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  gemsEarned: number;
  onDone: () => void;
}

export default function GemOverlay({ visible, gemsEarned, onDone }: Props) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <Animated.View entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(300)} style={styles.center}>
        <Animated.Text entering={FadeIn.delay(100)} style={styles.gem}>💎</Animated.Text>
        <Animated.Text entering={FadeIn.delay(250)} style={styles.amount}>+{gemsEarned} gems</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gem: {
    fontSize: 72,
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    textShadowColor: 'rgba(59,130,246,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
    letterSpacing: -0.5,
  },
});
