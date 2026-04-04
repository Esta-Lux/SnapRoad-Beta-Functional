import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api/client';

/** GPS often reads 1–4 mph while parked; cap keeps capture safe without blocking legitimate stopped reports. */
const STATIONARY_MAX_MPH = 5;

interface Props {
  visible: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
  isLight?: boolean;
  /** When set, camera / submit blocked above this speed (safety). */
  speedMph?: number;
}

export default function PhotoReportSheet({
  visible,
  lat,
  lng,
  onClose,
  isLight = false,
  speedMph = 0,
}: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setImageUri(null);
      setSubmitting(false);
    }
  }, [visible]);

  const bg = isLight ? '#ffffff' : '#111827';
  const titleColor = isLight ? '#111827' : '#f8fafc';
  const subColor = isLight ? '#64748b' : '#94a3b8';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const chipBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)';
  const iconBg = isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)';

  function blockIfMoving(): boolean {
    if (speedMph > STATIONARY_MAX_MPH) {
      Alert.alert(
        'Stop to capture',
        'Photo reports are only available while you are stopped or moving very slowly (about 5 mph or less). Pull over safely before opening the camera.',
      );
      return true;
    }
    return false;
  }

  async function takePhoto() {
    if (blockIfMoving()) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setImageUri(result.assets[0].uri);
  }

  async function chooseFromGallery() {
    if (blockIfMoving()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Photo library access is needed to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setImageUri(result.assets[0].uri);
  }

  async function submitReport() {
    if (!imageUri) return;
    if (blockIfMoving()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      formData.append('file', { uri: imageUri, name: filename, type: mimeType } as unknown as Blob);
      formData.append('lat', String(lat));
      formData.append('lng', String(lng));
      formData.append('description', 'Photo road report');

      const res = await api.upload<{
        success?: boolean;
        pending_review?: boolean;
        message?: string;
        report?: unknown;
      }>('/api/photo-reports/upload', formData);
      if (!res.success) {
        Alert.alert('Could not submit', (res as { error?: string }).error || 'Please try again.');
        return;
      }
      const data = res.data as { pending_review?: boolean; message?: string };
      if (data?.pending_review) {
        Alert.alert(
          'Privacy review',
          data?.message ||
            'This photo needs a quick human review before it can appear on the map. Faces and plates are never shown unblurred.',
          [{ text: 'OK', onPress: onClose }],
        );
        return;
      }
      Alert.alert(
        'Report submitted',
        'Your photo was checked on our servers; faces and plates are blurred before others can see it. Always drive safely — this is for awareness, not for avoiding enforcement.',
        [{ text: 'OK', onPress: onClose }],
      );
    } catch {
      Alert.alert('Error', 'Could not submit the report right now.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(280).damping(22).stiffness(240)}
      exiting={SlideOutDown.duration(180)}
      style={[styles.container, { backgroundColor: bg, borderColor }]}
    >
      <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]} />

      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name="warning-outline" size={20} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: titleColor }]}>Report Road Hazard</Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: chipBg }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={subColor} />
        </TouchableOpacity>
      </View>

      {speedMph > STATIONARY_MAX_MPH && (
        <Text style={[styles.stationaryHint, { color: subColor }]}>
          Stay at ~{STATIONARY_MAX_MPH} mph or below to take or submit a photo report.
        </Text>
      )}
      {!imageUri ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.8}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor }]}
            onPress={chooseFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={16} color="#3B82F6" />
            <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewBlock}>
          <Image source={{ uri: imageUri }} style={[styles.preview, { borderColor }]} resizeMode="cover" />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor }]}
              onPress={() => setImageUri(null)}
              disabled={submitting}
            >
              <Text style={[styles.outlineBtnText, { color: '#3B82F6' }]}>Choose different photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={submitReport}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    zIndex: 30,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  privacyNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  primaryBtnDisabled: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '700',
  },
  previewBlock: {
    marginTop: 16,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  previewActions: {
    marginTop: 14,
    gap: 10,
  },
  stationaryHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    marginBottom: 2,
    fontWeight: '600',
  },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
