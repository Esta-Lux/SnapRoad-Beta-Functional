// SnapRoad Mobile - Welcome Screen
// Onboarding carousel with feature highlights

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Button } from '../components/ui';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

const slides = [
  {
    id: '1',
    icon: 'shield-checkmark' as const,
    iconColor: Colors.success,
    title: 'Drive Safer',
    description: 'Track your driving habits and improve your safety score with real-time feedback.',
    gradient: [Colors.success, '#059669'],
  },
  {
    id: '2',
    icon: 'diamond' as const,
    iconColor: Colors.accent,
    title: 'Earn Gems',
    description: 'Every safe trip earns you gems. Redeem them for exclusive rewards and discounts.',
    gradient: [Colors.accent, '#c026d3'],
  },
  {
    id: '3',
    icon: 'gift' as const,
    iconColor: Colors.primary,
    title: 'Local Offers',
    description: 'Discover special deals from businesses near you. Save while you drive safely.',
    gradient: Colors.gradientPrimary,
  },
  {
    id: '4',
    icon: 'trophy' as const,
    iconColor: Colors.gold,
    title: 'Compete & Win',
    description: 'Join challenges, climb the leaderboard, and unlock exclusive badges.',
    gradient: [Colors.gold, Colors.warning],
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.replace('PlanSelection');
    }
  };

  const handleSkip = () => {
    navigation.replace('PlanSelection');
  };

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={item.gradient as [string, string]}
            style={styles.iconBg}
          >
            <View style={styles.iconInner}>
              <Ionicons name={item.icon} size={64} color={item.iconColor} />
            </View>
          </LinearGradient>
          
          {/* Decorative dots */}
          <View style={[styles.dot, styles.dot1, { backgroundColor: item.iconColor }]} />
          <View style={[styles.dot, styles.dot2, { backgroundColor: item.iconColor }]} />
          <View style={[styles.dot, styles.dot3, { backgroundColor: item.iconColor }]} />
        </Animated.View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                { width: dotWidth, opacity },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0a1929']}
        style={styles.gradient}
      >
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Slides */}
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          scrollEventThrottle={16}
        />

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {renderPagination()}

          <View style={styles.buttonContainer}>
            <Button
              title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              onPress={handleNext}
              icon={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'}
              size="lg"
            />
          </View>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 48,
  },
  iconBg: {
    width: 180,
    height: 180,
    borderRadius: 90,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  dot1: {
    top: 10,
    right: 20,
  },
  dot2: {
    bottom: 30,
    left: -10,
  },
  dot3: {
    bottom: 0,
    right: 0,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  buttonContainer: {
    marginBottom: Spacing.lg,
  },
  termsText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WelcomeScreen;
