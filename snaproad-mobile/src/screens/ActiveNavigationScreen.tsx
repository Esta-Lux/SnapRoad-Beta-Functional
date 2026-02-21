// SnapRoad Mobile - Active Navigation Screen
// Turn-by-turn driving guidance with premium glass UI

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const MOCK_STEPS = [
  { instruction: 'Head north on High St', distance: '0.3 mi', icon: 'arrow-up' as const },
  { instruction: 'Turn right onto Broad St', distance: '0.8 mi', icon: 'arrow-forward' as const },
  { instruction: 'Continue onto I-71 N', distance: '3.2 mi', icon: 'arrow-up' as const },
  { instruction: 'Take exit 108B for US-23', distance: '0.5 mi', icon: 'log-out-outline' as const },
  { instruction: 'Arrive at destination', distance: '', icon: 'flag' as const },
];

export const ActiveNavigationScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [eta, setEta] = useState('14 min');
  const [distLeft, setDistLeft] = useState('4.8 mi');
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const dest = route?.params?.destination || 'Work';

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const currentStep = MOCK_STEPS[stepIndex];
  const nextStep = MOCK_STEPS[stepIndex + 1];

  return (
    <View style={s.container}>
      {/* Map Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#0A1628', '#070E1B', '#0D1830']} style={StyleSheet.absoluteFill} />
        {[...Array(20)].map((_, i) => <View key={`h${i}`} style={[s.gridH, { top: (i*H)/20 }]} />)}
        {[...Array(12)].map((_, i) => <View key={`v${i}`} style={[s.gridV, { left: (i*W)/12 }]} />)}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGrad id="navRoute" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#2563EB" /><Stop offset="1" stopColor="#06D6A0" />
            </SvgGrad>
          </Defs>
          <Path d={`M${W*0.5} ${H*0.95} L${W*0.5} ${H*0.65} Q${W*0.55} ${H*0.55} ${W*0.65} ${H*0.45} L${W*0.65} ${H*0.25} Q${W*0.6} ${H*0.18} ${W*0.55} ${H*0.12}`} fill="none" stroke="#2563EB" strokeWidth={14} strokeLinecap="round" opacity={0.12} />
          <Path d={`M${W*0.5} ${H*0.95} L${W*0.5} ${H*0.65} Q${W*0.55} ${H*0.55} ${W*0.65} ${H*0.45} L${W*0.65} ${H*0.25} Q${W*0.6} ${H*0.18} ${W*0.55} ${H*0.12}`} fill="none" stroke="url(#navRoute)" strokeWidth={5} strokeLinecap="round" />
          <Circle cx={W*0.65} cy={H*0.45} r={4} fill="#38BDF8" opacity={0.5} />
        </Svg>
        {/* Vehicle marker */}
        <View style={s.vehicleMarker}>
          <Animated.View style={[s.vehiclePulse, { opacity: pulseAnim, transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4,1], outputRange: [1,2] }) }] }]} />
          <LinearGradient colors={Colors.gradientPrimary} style={s.vehicleDot}>
            <Ionicons name="navigate" size={16} color="#fff" />
          </LinearGradient>
        </View>
      </View>

      {/* Top: Current Instruction */}
      <View style={[s.instructionCard, { paddingTop: insets.top + 8 }]}>
        <LinearGradient colors={['#1D4ED8', '#2563EB']} style={s.instructionGrad}>
          <View style={s.instructionRow}>
            <View style={s.turnIcon}>
              <Ionicons name={currentStep.icon} size={28} color="#fff" />
            </View>
            <View style={s.instructionText}>
              <Text style={s.instructionMain}>{currentStep.instruction}</Text>
              {currentStep.distance ? <Text style={s.instructionDist}>{currentStep.distance}</Text> : null}
            </View>
          </View>
          {nextStep && (
            <View style={s.nextStep}>
              <Text style={s.nextLabel}>Then</Text>
              <Ionicons name={nextStep.icon} size={14} color="rgba(255,255,255,0.6)" />
              <Text style={s.nextText}>{nextStep.instruction}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Bottom Controls */}
      <View style={[s.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        {/* ETA Bar */}
        <View style={s.etaRow}>
          <View style={s.etaBlock}>
            <Text style={s.etaValue}>{eta}</Text>
            <Text style={s.etaLabel}>ETA</Text>
          </View>
          <View style={s.etaDivider} />
          <View style={s.etaBlock}>
            <Text style={s.etaValue}>{distLeft}</Text>
            <Text style={s.etaLabel}>Distance</Text>
          </View>
          <View style={s.etaDivider} />
          <View style={s.etaBlock}>
            <Text style={[s.etaValue, { color: Colors.secondary }]}>94</Text>
            <Text style={s.etaLabel}>Safety</Text>
          </View>
        </View>

        {/* Destination */}
        <View style={s.destRow}>
          <Ionicons name="flag" size={16} color={Colors.secondary} />
          <Text style={s.destText} numberOfLines={1}>{dest}</Text>
          <TouchableOpacity style={s.muteBtn}>
            <Ionicons name="volume-medium-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation?.navigate('PhotoCapture')}>
            <Ionicons name="camera-outline" size={20} color={Colors.textSecondary} />
            <Text style={s.actionLabel}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn}>
            <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
            <Text style={s.actionLabel}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation?.navigate('OrionCoach')}>
            <Ionicons name="mic-outline" size={20} color={Colors.primaryLight} />
            <Text style={[s.actionLabel, { color: Colors.primaryLight }]}>Orion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.endBtn]} onPress={() => navigation?.goBack()}>
            <Text style={s.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(37,99,235,0.05)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(37,99,235,0.05)' },
  vehicleMarker: { position: 'absolute', left: W/2-24, bottom: H*0.05, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  vehiclePulse: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(37,99,235,0.15)' },
  vehicleDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  // Instruction card
  instructionCard: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10 },
  instructionGrad: { marginHorizontal: 16, borderRadius: BorderRadius.xxl, padding: 20, ...Shadows.lg },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  turnIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  instructionText: { flex: 1 },
  instructionMain: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, letterSpacing: 0.2 },
  instructionDist: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, marginTop: 4 },
  nextStep: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  nextLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  nextText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, flex: 1 },
  // Bottom card
  bottomCard: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.glass, borderTopWidth: 1, borderTopColor: Colors.glassBorder, paddingHorizontal: 20, paddingTop: 20, zIndex: 10 },
  etaRow: { flexDirection: 'row', marginBottom: 16 },
  etaBlock: { flex: 1, alignItems: 'center' },
  etaValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  etaLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' },
  etaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  destText: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  muteBtn: { padding: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface },
  actionLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  endBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  endBtnText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});

export default ActiveNavigationScreen;
