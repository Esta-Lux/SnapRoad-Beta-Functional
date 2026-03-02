// SnapRoad Mobile - Premium Photo Capture
// Privacy-first, neon blue accents, glass UI

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Accident', icon: 'car-outline' as const, color: Colors.error },
  { id: 'hazard', label: 'Hazard', icon: 'warning-outline' as const, color: '#F59E0B' },
  { id: 'construction', label: 'Construction', icon: 'construct-outline' as const, color: '#FF9F1C' },
  { id: 'weather', label: 'Weather', icon: 'rainy-outline' as const, color: Colors.primaryLight },
  { id: 'closure', label: 'Closure', icon: 'close-circle-outline' as const, color: Colors.accent },
  { id: 'police', label: 'Police', icon: 'shield-outline' as const, color: Colors.secondary },
];

export const PhotoCaptureScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'capture'|'details'>('capture');
  const [selectedType, setSelectedType] = useState('');
  const [desc, setDesc] = useState('');
  const [blur, setBlur] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    navigation?.goBack();
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report Incident</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'capture' ? (
        <View style={s.captureView}>
          <View style={s.cameraBox}>
            {/* Scan corners */}
            <View style={[s.corner, s.cTL]} /><View style={[s.corner, s.cTR]} />
            <View style={[s.corner, s.cBL]} /><View style={[s.corner, s.cBR]} />
            <Ionicons name="camera-outline" size={56} color={Colors.textDim} />
            <Text style={s.camText}>Tap capture to take photo</Text>
          </View>

          {/* Privacy Banner */}
          <View style={s.privBanner}>
            <LinearGradient colors={['#1D4ED8', '#2563EB']} style={s.privGrad}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={s.privTitle}>Privacy Shield Active</Text>
                <Text style={s.privSub}>Faces & plates auto-blurred by AI</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={s.captureRow}>
            <TouchableOpacity style={s.sideBtn}><Ionicons name="images-outline" size={24} color={Colors.text} /></TouchableOpacity>
            <TouchableOpacity style={s.captureBtn} onPress={() => setStep('details')}>
              <View style={s.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={s.sideBtn}><Ionicons name="camera-reverse-outline" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={s.detailsView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.previewBox}>
            <Ionicons name="image-outline" size={40} color={Colors.textDim} />
            <Text style={s.previewText}>Photo captured</Text>
            {blur && (
              <View style={s.blurTag}>
                <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
                <Text style={s.blurTagText}>Blur applied</Text>
              </View>
            )}
          </View>

          <Text style={s.label}>Incident Type</Text>
          <View style={s.typeGrid}>
            {INCIDENT_TYPES.map(t => (
              <TouchableOpacity key={t.id} style={[s.typeCard, selectedType===t.id && { borderColor: t.color }]} onPress={() => setSelectedType(t.id)}>
                <Ionicons name={t.icon} size={22} color={selectedType===t.id ? t.color : Colors.textMuted} />
                <Text style={[s.typeLabel, selectedType===t.id && { color: Colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Description</Text>
          <TextInput style={s.descInput} placeholder="What happened?" placeholderTextColor={Colors.textDim} value={desc} onChangeText={setDesc} multiline numberOfLines={3} />

          <TouchableOpacity style={s.toggleRow} onPress={() => setBlur(!blur)}>
            <Ionicons name={blur ? 'eye-off-outline' : 'eye-outline'} size={20} color={blur ? Colors.primary : Colors.textMuted} />
            <Text style={s.toggleText}>Privacy Blur {blur ? 'Enabled' : 'Disabled'}</Text>
            <View style={[s.toggle, blur && s.toggleOn]}>
              <View style={[s.toggleDot, blur && s.toggleDotOn]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.submitBtn, (!selectedType||submitting) && { opacity: 0.4 }]} onPress={handleSubmit} disabled={!selectedType||submitting}>
            <LinearGradient colors={Colors.gradientPrimary} style={s.submitGrad}>
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="cloud-upload-outline" size={20} color="#fff" /><Text style={s.submitText}>Submit Report</Text></>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.3 },
  captureView: { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
  cameraBox: { flex: 1, margin: 16, borderRadius: BorderRadius.xxl, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: Colors.glassBorder },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.primary },
  cTL: { top: 24, left: 24, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cTR: { top: 24, right: 24, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cBL: { bottom: 24, left: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cBR: { bottom: 24, right: 24, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  camText: { color: Colors.textDim, fontSize: FontSizes.sm, marginTop: 12, letterSpacing: 0.3 },
  privBanner: { marginHorizontal: 16, marginBottom: 20 },
  privGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: BorderRadius.lg, padding: 16 },
  privTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  privSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs, marginTop: 2 },
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.error },
  detailsView: { flex: 1, paddingHorizontal: 16 },
  previewBox: { height: 180, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  previewText: { color: Colors.textDim, fontSize: FontSizes.sm, marginTop: 8 },
  blurTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${Colors.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 12 },
  blurTagText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  label: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.5, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: { width: '31%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: 14, alignItems: 'center', gap: 6 },
  typeLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  descInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, color: Colors.text, fontSize: FontSizes.md, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, marginBottom: 24 },
  toggleText: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  toggleDotOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  submitBtn: { overflow: 'hidden', borderRadius: BorderRadius.lg },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54 },
  submitText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});

export default PhotoCaptureScreen;
