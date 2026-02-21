// SnapRoad Mobile - Photo Capture Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/PhotoCapture.tsx
// Privacy-first photo capture with AI blur for faces/plates

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../utils/theme';

interface PhotoCaptureScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Car Accident', icon: 'car', color: '#FF5A5A' },
  { id: 'hazard', label: 'Road Hazard', icon: 'warning', color: '#FFC24C' },
  { id: 'construction', label: 'Construction', icon: 'construct', color: '#FF9F1C' },
  { id: 'weather', label: 'Weather Issue', icon: 'rainy', color: '#0084FF' },
  { id: 'closure', label: 'Road Closure', icon: 'close-circle', color: '#9D4EDD' },
  { id: 'police', label: 'Police Activity', icon: 'shield', color: '#00DFA2' },
];

export const PhotoCaptureScreen: React.FC<PhotoCaptureScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'capture' | 'details'>('capture');
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [privacyBlur, setPrivacyBlur] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    if (onNavigate) onNavigate('map');
    else if (navigation) navigation.goBack();
  };

  const handleCapture = () => {
    // In real app: launch camera via expo-camera
    setStep('details');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulated API call
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    handleBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'capture' ? (
        <View style={styles.captureView}>
          {/* Camera placeholder */}
          <View style={styles.cameraPlaceholder}>
            <View style={styles.cameraFrame}>
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
            </View>
            <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.cameraText}>Tap to capture photo</Text>
          </View>

          {/* Privacy Shield Banner */}
          <View style={styles.privacyBanner}>
            <LinearGradient
              colors={['#0084FF', '#004A93']}
              style={styles.privacyGradient}
            >
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>Privacy Shield Active</Text>
                <Text style={styles.privacySub}>Faces & plates will be automatically blurred</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Capture Button */}
          <View style={styles.captureButtonRow}>
            <TouchableOpacity style={styles.galleryBtn}>
              <Ionicons name="images" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
              <View style={styles.captureBtnInner}>
                <View style={styles.captureBtnDot} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipBtn}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.detailsView} showsVerticalScrollIndicator={false}>
          {/* Photo Preview Placeholder */}
          <View style={styles.previewPlaceholder}>
            <Ionicons name="image" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.previewText}>Photo captured</Text>
            {privacyBlur && (
              <View style={styles.blurBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#0084FF" />
                <Text style={styles.blurBadgeText}>Privacy blur applied</Text>
              </View>
            )}
          </View>

          {/* Incident Type */}
          <Text style={styles.sectionLabel}>Incident Type</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && { borderColor: type.color },
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons name={type.icon as any} size={24} color={type.color} />
                <Text style={styles.typeLabel}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.sectionLabel}>Description (optional)</Text>
          <TextInput
            style={styles.descInput}
            placeholder="What happened?"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Privacy Toggle */}
          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setPrivacyBlur(!privacyBlur)}
          >
            <Ionicons
              name={privacyBlur ? 'eye-off' : 'eye'}
              size={20}
              color={privacyBlur ? '#0084FF' : 'rgba(255,255,255,0.4)'}
            />
            <Text style={styles.privacyToggleText}>
              Privacy Blur {privacyBlur ? 'Enabled' : 'Disabled'}
            </Text>
            <View style={[styles.toggleTrack, privacyBlur && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, privacyBlur && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!selectedType || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedType || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  // Capture
  captureView: { flex: 1, justifyContent: 'space-between' },
  cameraPlaceholder: {
    flex: 1, margin: 16, borderRadius: 20, backgroundColor: '#1A1F2E',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  cameraFrame: { position: 'absolute', top: 40, left: 40, right: 40, bottom: 40 },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#0084FF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  cameraText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 16 },
  privacyBanner: { marginHorizontal: 16, marginBottom: 16 },
  privacyGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 16,
  },
  privacyText: { flex: 1 },
  privacyTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  privacySub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  captureButtonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 40, paddingBottom: 40,
  },
  galleryBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnDot: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF5A5A' },
  flipBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center' },
  // Details
  detailsView: { flex: 1, paddingHorizontal: 16 },
  previewPlaceholder: {
    height: 200, backgroundColor: '#1A1F2E', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  previewText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
  blurBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,132,255,0.1)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8, marginTop: 12,
  },
  blurBadgeText: { color: '#0084FF', fontSize: 12, fontWeight: '500' },
  sectionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '31%', backgroundColor: '#1A1F2E', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 12, alignItems: 'center', gap: 6,
  },
  typeLabel: { color: '#fff', fontSize: 11, textAlign: 'center' },
  descInput: {
    backgroundColor: '#1A1F2E', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', padding: 16,
    color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top',
    marginBottom: 16,
  },
  privacyToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1F2E', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  privacyToggleText: { flex: 1, color: '#fff', fontSize: 14 },
  toggleTrack: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleTrackActive: { backgroundColor: '#0084FF' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#0084FF', borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PhotoCaptureScreen;
