import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
  isLight?: boolean;
}

interface FillUp {
  id: string;
  date: string;
  gallons: number;
  price_per_gallon: number;
  odometer: number;
  mpg?: number;
}

export default function FuelTracker({ visible, onClose, isLight }: Props) {
  const [gallons, setGallons] = useState('');
  const [price, setPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FillUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = isLight ? '#f5f5f7' : '#0f172a';
  const cardBg = isLight ? '#ffffff' : '#1e293b';
  const text = isLight ? '#1e293b' : '#f8fafc';
  const sub = isLight ? '#64748b' : '#94a3b8';
  const inputBg = isLight ? '#e2e8f0' : '#334155';

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<FillUp[]>('/api/fuel/history')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setHistory(res.data.slice(0, 5));
        } else {
          setError(res.error || 'Failed to load history');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (visible) fetchHistory();
  }, [visible, fetchHistory]);

  const handleSubmit = async () => {
    const g = parseFloat(gallons);
    const p = parseFloat(price);
    const o = parseFloat(odometer);
    if (!g || !p || !o) {
      Alert.alert('Missing fields', 'Please fill in all fields with valid numbers.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/fuel/log', {
        gallons: g,
        price_per_gallon: p,
        odometer: o,
      });
      if (res.success) {
        setGallons('');
        setPrice('');
        setOdometer('');
        fetchHistory();
      } else {
        Alert.alert('Error', res.error || 'Failed to log fill-up');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFillUp = ({ item }: { item: FillUp }) => {
    const total = (item.gallons * item.price_per_gallon).toFixed(2);
    const mpgText = item.mpg != null ? item.mpg.toFixed(1) : '—';
    return (
      <View style={[styles.fillUpCard, { backgroundColor: cardBg }]}>
        <View style={styles.fillUpRow}>
          <Text style={[styles.fillUpDate, { color: sub }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
          <Text style={[styles.fillUpMpg, { color: '#3B82F6' }]}>{mpgText} MPG</Text>
        </View>
        <View style={styles.fillUpRow}>
          <Text style={[styles.fillUpDetail, { color: text }]}>
            {item.gallons.toFixed(2)} gal
          </Text>
          <Text style={[styles.fillUpDetail, { color: text }]}>${total}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: text }]}>Fuel Tracker</Text>

        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.fieldLabel, { color: sub }]}>Gallons</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: text }]}
            placeholder="0.00"
            placeholderTextColor={sub}
            keyboardType="numeric"
            value={gallons}
            onChangeText={setGallons}
          />

          <Text style={[styles.fieldLabel, { color: sub }]}>Price per gallon ($)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: text }]}
            placeholder="0.00"
            placeholderTextColor={sub}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <Text style={[styles.fieldLabel, { color: sub }]}>Odometer</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: text }]}
            placeholder="0"
            placeholderTextColor={sub}
            keyboardType="numeric"
            value={odometer}
            onChangeText={setOdometer}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Log Fill-up</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: text }]}>Recent Fill-ups</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : history.length === 0 ? (
          <Text style={[styles.emptyText, { color: sub }]}>No fill-ups yet</Text>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderFillUp}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  fillUpCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fillUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fillUpDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  fillUpMpg: {
    fontSize: 13,
    fontWeight: '800',
  },
  fillUpDetail: {
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: 30,
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
});
