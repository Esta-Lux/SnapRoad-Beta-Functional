import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  navigation: any;
};

const SLIDES = [
  {
    tag: 'Smarter Driving',
    titleTop: 'Your road,',
    titleAccent: 'perfectly guided.',
    body: 'SnapRoad gives drivers real-time road intelligence, rewards, and community alerts in one clear experience.',
    colors: ['#030d1f', '#0b1f45', '#0d3580'] as const,
    kind: 'road' as const,
  },
  {
    tag: 'Real-Time Alerts',
    titleTop: 'Know what is',
    titleAccent: 'ahead of you.',
    body: 'Traffic, hazards, and route awareness arrive before you do, so every mile feels more predictable.',
    colors: ['#02101d', '#062647', '#0b3e66'] as const,
    kind: 'map' as const,
  },
  {
    tag: 'Community Power',
    titleTop: 'Thousands of',
    titleAccent: 'eyes on the road.',
    body: 'Drivers confirm incidents together and help keep the next person behind them safer and better informed.',
    colors: ['#03101a', '#052032', '#09311a'] as const,
    kind: 'community' as const,
  },
  {
    tag: 'Driver Rewards',
    titleTop: 'Earn as you',
    titleAccent: 'drive every day.',
    body: 'Unlock nearby fuel, food, and partner offers right on your route and redeem them with a tap or QR code.',
    colors: ['#05101e', '#0a1f38', '#12284d'] as const,
    kind: 'offers' as const,
  },
  {
    tag: 'Your Journey',
    titleTop: 'Drive smarter,',
    titleAccent: 'every single trip.',
    body: 'Safety scores, trip insights, and a helpful driving community are ready when you are.',
    colors: ['#02070d', '#08111d', '#10253b'] as const,
    kind: 'dashboard' as const,
  },
];

function SlideArtwork({ kind }: { kind: (typeof SLIDES)[number]['kind'] }) {
  if (kind === 'road') {
    return (
      <>
        <View style={[styles.glowOrb, { top: 120, right: 40, width: 170, height: 170, backgroundColor: 'rgba(32,102,220,0.25)' }]} />
        <View style={[styles.cityBase, { left: 0, right: 0 }]} />
        <View style={[styles.roadCone, { borderBottomColor: 'rgba(255,255,255,0.06)' }]} />
        <View style={[styles.roadSurface, { borderTopColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.roadLine, { bottom: 148 }]} />
        <View style={[styles.roadLine, { bottom: 104 }]} />
        <View style={[styles.roadLine, { bottom: 60 }]} />
      </>
    );
  }

  if (kind === 'map') {
    return (
      <>
        <View style={[styles.gridLineH, { top: 180 }]} />
        <View style={[styles.gridLineH, { top: 260 }]} />
        <View style={[styles.gridLineH, { top: 340 }]} />
        <View style={[styles.gridLineV, { left: 72 }]} />
        <View style={[styles.gridLineV, { left: 182 }]} />
        <View style={[styles.gridLineV, { left: 292 }]} />
        <View style={[styles.routePath]} />
        <View style={[styles.pin, { left: 56, top: 530 }]} />
        <View style={[styles.pin, styles.pinDestination, { right: 46, top: 230 }]} />
        <View style={[styles.signalCard, { top: 214, left: 20 }]}>
          <Text style={styles.signalLabel}>SPEED</Text>
          <Text style={styles.signalValue}>62 mph</Text>
        </View>
        <View style={[styles.signalCard, { top: 376, right: 20 }]}>
          <Text style={styles.signalLabel}>ETA</Text>
          <Text style={styles.signalValue}>12 min</Text>
        </View>
      </>
    );
  }

  if (kind === 'community') {
    return (
      <>
        <View style={[styles.networkLine, { width: 118, top: 322, left: 98, transform: [{ rotate: '58deg' }] }]} />
        <View style={[styles.networkLine, { width: 112, top: 320, left: 178, transform: [{ rotate: '-52deg' }] }]} />
        <View style={[styles.networkLine, { width: 106, top: 246, left: 146, transform: [{ rotate: '-110deg' }] }]} />
        <View style={[styles.avatarNode, styles.avatarNodePrimary, { top: 282, left: 164 }]} />
        <View style={[styles.avatarNode, { top: 398, left: 80 }]} />
        <View style={[styles.avatarNode, { top: 382, right: 84 }]} />
        <View style={[styles.avatarNodeSmall, { top: 194, left: 130 }]} />
        <View style={[styles.avatarNodeSmall, { top: 214, right: 70 }]} />
        <View style={[styles.communityCard]}>
          <Text style={styles.communityTitle}>Road work ahead</Text>
          <Text style={styles.communityMeta}>Reported 2 min ago · 14 confirms</Text>
        </View>
      </>
    );
  }

  if (kind === 'offers') {
    return (
      <>
        <View style={[styles.offerCard, { top: 170, left: 20 }]}>
          <Text style={styles.offerEyebrow}>GAS STATION</Text>
          <Text style={styles.offerTitle}>10c off</Text>
          <Text style={styles.offerMeta}>Per gallon · 0.4 mi away</Text>
        </View>
        <View style={[styles.offerCard, styles.offerCardBlue, { top: 214, right: 20 }]}>
          <Text style={styles.offerEyebrow}>COFFEE SHOP</Text>
          <Text style={styles.offerTitle}>Free upgrade</Text>
          <Text style={styles.offerMeta}>With any purchase</Text>
        </View>
        <View style={[styles.offerCard, styles.offerCardGreen, { top: 306, left: 64 }]}>
          <Text style={styles.offerEyebrow}>RESTAURANT</Text>
          <Text style={styles.offerTitle}>15% off lunch</Text>
          <Text style={styles.offerMeta}>On your route · 1.2 mi</Text>
        </View>
        <View style={[styles.rewardBubble, { top: 154, right: 28 }]}>
          <Text style={styles.rewardBubbleLabel}>GEMS</Text>
          <Text style={styles.rewardBubbleValue}>247</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.gaugeArcBase} />
      <View style={styles.gaugeArcActive} />
      <Text style={styles.dashboardSpeed}>68</Text>
      <Text style={styles.dashboardSpeedLabel}>mph</Text>
      <View style={styles.dashboardNeedle} />
      <View style={[styles.metricCard, { left: 20 }]}>
        <Text style={styles.metricLabel}>SAFETY SCORE</Text>
        <Text style={styles.metricValue}>94</Text>
      </View>
      <View style={[styles.metricCard, { left: 138 }]}>
        <Text style={styles.metricLabel}>TRIPS TODAY</Text>
        <Text style={styles.metricValue}>3</Text>
      </View>
      <View style={[styles.metricCard, { right: 20 }]}>
        <Text style={styles.metricLabel}>DISTANCE</Text>
        <Text style={styles.metricValue}>47 mi</Text>
      </View>
    </>
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideWidth = Math.max(320, width);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [slideProgress, setSlideProgress] = React.useState(0);
  const translateX = useSharedValue(0);

  const goToSlide = React.useCallback((index: number) => {
    const next = (index + SLIDES.length) % SLIDES.length;
    setCurrentSlide(next);
    setSlideProgress(0);
    translateX.value = withTiming(-(next * slideWidth), {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [slideWidth, translateX]);

  React.useEffect(() => {
    translateX.value = -(currentSlide * slideWidth);
  }, [currentSlide, slideWidth, translateX]);

  React.useEffect(() => {
    const progressTimer = setInterval(() => {
      setSlideProgress((prev) => {
        const next = prev + 50 / 4000;
        if (next >= 1) {
          setCurrentSlide((curr) => {
            const upcoming = (curr + 1) % SLIDES.length;
            translateX.value = withTiming(-(upcoming * slideWidth), {
              duration: 650,
              easing: Easing.out(Easing.cubic),
            });
            return upcoming;
          });
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(progressTimer);
  }, [slideWidth, translateX]);

  const slidesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const progressPercent = ((currentSlide + slideProgress) / SLIDES.length) * 100;
  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.slidesRow, { width: slideWidth * SLIDES.length }, slidesStyle]}>
        {SLIDES.map((item, index) => (
          <Pressable
            key={item.tag}
            style={{ width: slideWidth, flex: 1 }}
            onPress={() => goToSlide(index + 1)}
          >
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.slide}
            >
              <View style={styles.starLayer}>
                <View style={[styles.star, { top: 92, left: 36 }]} />
                <View style={[styles.star, { top: 60, left: 114, opacity: 0.45 }]} />
                <View style={[styles.star, { top: 84, right: 52, width: 3, height: 3 }]} />
                <View style={[styles.star, { top: 164, right: 26, opacity: 0.55 }]} />
              </View>
              <SlideArtwork kind={item.kind} />
              <LinearGradient
                colors={['rgba(5,13,31,0.12)', 'rgba(5,13,31,0.2)', 'rgba(5,13,31,0.92)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.slideOverlay}
              />
            </LinearGradient>
          </Pressable>
        ))}
      </Animated.View>

      <View style={[styles.topBrand, { top: insets.top + 18 }]}>
        <View style={styles.logoMark}>
          <Image source={require('../../assets/brand-logo.png')} style={styles.brandLogo} resizeMode="contain" />
        </View>
        <Text style={styles.logoText}>SnapRoad</Text>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(550)} style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{slide.tag}</Text>
        </Animated.View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.indicators}>
          {SLIDES.map((item, index) => (
            <TouchableOpacity
              key={item.tag}
              style={[styles.indicator, index === currentSlide && styles.indicatorActive]}
              onPress={() => goToSlide(index)}
              activeOpacity={0.85}
            />
          ))}
        </View>

        <Animated.Text entering={FadeInDown.delay(80).duration(550)} style={styles.headline}>
          {slide.titleTop}
          {'\n'}
          <Text style={styles.headlineAccent}>{slide.titleAccent}</Text>
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(550)} style={styles.body}>
          {slide.body}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(220).duration(500)} style={styles.actions}>
          <TouchableOpacity
            testID="e2e-welcome-create-account"
            style={styles.primaryBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Auth', { mode: 'signup' });
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryText}>Get Started - It&apos;s Free</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="e2e-welcome-sign-in"
            style={styles.secondaryBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Auth', { mode: 'signin' });
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.learnMoreRow}>
          <Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.learnMoreText}>Learn more at snaproad.co</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050d1f', overflow: 'hidden' },
  slidesRow: { flexDirection: 'row', flex: 1 },
  slide: { flex: 1 },
  slideOverlay: { ...StyleSheet.absoluteFillObject },
  starLayer: { ...StyleSheet.absoluteFillObject },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  topBrand: {
    position: 'absolute',
    left: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogo: { width: 24, height: 24 },
  logoText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: -0.2,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(80,160,255,0.4)',
    backgroundColor: 'rgba(26,111,212,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#1A6FD4',
    marginRight: 8,
  },
  badgeText: {
    color: '#7ab8f5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  indicator: {
    width: 8,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginRight: 6,
  },
  indicatorActive: {
    width: 28,
    backgroundColor: '#fff',
  },
  headline: {
    color: '#fff',
    fontSize: 35,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  headlineAccent: {
    color: '#7ab8f5',
    fontStyle: 'italic',
  },
  body: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 28,
    fontWeight: '300',
  },
  actions: { gap: 12 },
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: '#1A6FD4',
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#1A6FD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  learnMoreRow: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  learnMoreText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 6,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  cityBase: {
    position: 'absolute',
    bottom: 332,
    height: 132,
    backgroundColor: 'rgba(7,14,34,0.45)',
  },
  roadCone: {
    position: 'absolute',
    bottom: 0,
    left: 48,
    right: 48,
    height: 336,
    borderLeftWidth: 95,
    borderRightWidth: 95,
    borderBottomWidth: 336,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  roadSurface: {
    position: 'absolute',
    bottom: 0,
    left: 42,
    right: 42,
    height: 312,
    backgroundColor: 'rgba(18,32,64,0.76)',
    borderTopWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  roadLine: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    height: 30,
    borderRadius: 2,
    backgroundColor: 'rgba(255,220,80,0.65)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(26,111,212,0.12)',
  },
  gridLineV: {
    position: 'absolute',
    top: 150,
    bottom: 230,
    width: 1,
    backgroundColor: 'rgba(26,111,212,0.1)',
  },
  routePath: {
    position: 'absolute',
    left: 84,
    top: 246,
    width: 208,
    height: 274,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: 'rgba(94,182,255,0.72)',
    borderTopLeftRadius: 160,
    transform: [{ rotate: '-28deg' }],
  },
  pin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#1A6FD4',
    borderWidth: 4,
    borderColor: '#fff',
  },
  pinDestination: {
    backgroundColor: '#2E7D32',
  },
  signalCard: {
    position: 'absolute',
    width: 100,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  signalLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  networkLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(46,125,50,0.26)',
  },
  avatarNode: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(67,160,71,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarNodePrimary: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(26,111,212,0.86)',
  },
  avatarNodeSmall: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(67,160,71,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  communityCard: {
    position: 'absolute',
    top: 340,
    left: 110,
    right: 110,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  communityTitle: { color: '#fff', fontSize: 12, fontWeight: '700' },
  communityMeta: { color: 'rgba(255,255,255,0.52)', fontSize: 10, marginTop: 4 },
  offerCard: {
    position: 'absolute',
    width: 164,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  offerCardBlue: { backgroundColor: 'rgba(26,111,212,0.16)' },
  offerCardGreen: { backgroundColor: 'rgba(46,125,50,0.16)' },
  offerEyebrow: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  offerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 6 },
  offerMeta: { color: 'rgba(255,255,255,0.54)', fontSize: 10, marginTop: 6, lineHeight: 14 },
  rewardBubble: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: 'rgba(26,111,212,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(26,111,212,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBubbleLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rewardBubbleValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
  },
  gaugeArcBase: {
    position: 'absolute',
    top: 320,
    left: 32,
    width: 312,
    height: 170,
    borderTopLeftRadius: 170,
    borderTopRightRadius: 170,
    borderWidth: 18,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gaugeArcActive: {
    position: 'absolute',
    top: 320,
    left: 32,
    width: 196,
    height: 170,
    borderTopLeftRadius: 170,
    borderTopRightRadius: 170,
    borderWidth: 18,
    borderBottomWidth: 0,
    borderColor: 'rgba(26,111,212,0.62)',
  },
  dashboardSpeed: {
    position: 'absolute',
    top: 362,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 72,
    fontWeight: '300',
  },
  dashboardSpeedLabel: {
    position: 'absolute',
    top: 436,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 16,
  },
  dashboardNeedle: {
    position: 'absolute',
    top: 390,
    left: '50%',
    marginLeft: -48,
    width: 96,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(26,111,212,0.9)',
    transform: [{ rotate: '-58deg' }],
  },
  metricCard: {
    position: 'absolute',
    bottom: 170,
    width: 98,
    borderRadius: 16,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
});
