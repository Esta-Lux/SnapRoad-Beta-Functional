import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Dimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

interface Slide {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES: Slide[] = [
  { title: 'Welcome to SnapRoad', icon: 'navigate-outline', description: 'Smart navigation with real-time road intelligence' },
  { title: 'Stay Safe', icon: 'shield-outline', description: 'Community-powered incident reports keep you informed' },
  { title: 'Earn Rewards', icon: 'diamond-outline', description: 'Collect gems, complete challenges, unlock badges' },
  { title: 'Drive Together', icon: 'people-outline', description: 'Track friends and family on the road' },
];

export default function AppTour({ visible, onComplete }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      onComplete();
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={styles.iconRing}>
        <Ionicons name={item.icon} size={56} color="#3B82F6" />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.description}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(idx);
          }}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>
              {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={activeIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          {activeIndex < SLIDES.length - 1 && (
            <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    backgroundColor: '#3B82F6',
    width: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});
