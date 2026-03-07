// SnapRoad Mobile - My Offers Screen with QR Codes
// Customer can view purchased offers and show QR when near store

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Types
interface PurchasedOffer {
  id: string;
  title: string;
  description: string;
  businessName: string;
  businessLogo?: string;
  gemsSpent: number;
  originalGems: number;
  isRepeatPurchase: boolean;
  purchasedAt: string;
  expiresAt?: string;
  status: 'active' | 'redeemed' | 'expired';
  businessLocation: {
    lat: number;
    lng: number;
    address: string;
  };
}

// Sample data
const SAMPLE_OFFERS: PurchasedOffer[] = [
  {
    id: 'off_001',
    title: '$0.15 off per gallon',
    description: 'Save on your next fuel purchase',
    businessName: 'FuelStation Pro',
    gemsSpent: 50,
    originalGems: 50,
    isRepeatPurchase: false,
    purchasedAt: '2025-02-16',
    status: 'active',
    businessLocation: {
      lat: 41.4993,
      lng: -81.6944,
      address: '123 Main St, Cleveland, OH',
    },
  },
  {
    id: 'off_002',
    title: 'Free Car Wash',
    description: 'Basic car wash included with any fuel purchase',
    businessName: 'Auto Spa Center',
    gemsSpent: 80,
    originalGems: 100,
    isRepeatPurchase: true,
    purchasedAt: '2025-02-14',
    status: 'active',
    businessLocation: {
      lat: 41.5001,
      lng: -81.6950,
      address: '456 Oak Ave, Cleveland, OH',
    },
  },
  {
    id: 'off_003',
    title: '20% off Oil Change',
    description: 'Full synthetic oil change',
    businessName: 'Quick Lube Express',
    gemsSpent: 65,
    originalGems: 65,
    isRepeatPurchase: false,
    purchasedAt: '2025-02-10',
    expiresAt: '2025-02-08',
    status: 'expired',
    businessLocation: {
      lat: 41.5010,
      lng: -81.6960,
      address: '789 Elm St, Cleveland, OH',
    },
  },
];

interface MyOffersScreenProps {
  navigation?: any;
}

export function MyOffersScreen({ navigation }: MyOffersScreenProps) {
  const [offers, setOffers] = useState<PurchasedOffer[]>(SAMPLE_OFFERS);
  const [selectedOffer, setSelectedOffer] = useState<PurchasedOffer | null>(null);
  const [isNearStore, setIsNearStore] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const checkProximity = async (offer: PurchasedOffer) => {
    setSelectedOffer(offer);
    setCheckingLocation(true);
    setIsNearStore(false);
    setQrToken(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to use this offer');
        setCheckingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLat = location.coords.latitude;
      const userLng = location.coords.longitude;

      // Calculate distance using Haversine formula
      const R = 6371e3;
      const φ1 = (userLat * Math.PI) / 180;
      const φ2 = (offer.businessLocation.lat * Math.PI) / 180;
      const Δφ = ((offer.businessLocation.lat - userLat) * Math.PI) / 180;
      const Δλ = ((offer.businessLocation.lng - userLng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = R * c;

      setDistance(distanceMeters);

      // Near if within 500 meters
      if (distanceMeters <= 500) {
        setIsNearStore(true);
        // Generate QR token
        const token = `SR-${offer.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
        setQrToken(token);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get your location');
    } finally {
      setCheckingLocation(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#00DFA2';
      case 'redeemed':
        return '#0084FF';
      case 'expired':
        return '#FF5A5A';
      default:
        return '#8A9BB6';
    }
  };

  const renderOfferCard = (offer: PurchasedOffer) => (
    <TouchableOpacity
      key={offer.id}
      style={styles.offerCard}
      onPress={() => offer.status === 'active' && checkProximity(offer)}
      disabled={offer.status !== 'active'}
    >
      <View style={styles.offerHeader}>
        <View style={styles.businessInfo}>
          <View style={styles.businessIcon}>
            <Ionicons name="storefront" size={20} color="#00DFA2" />
          </View>
          <View>
            <Text style={styles.businessName}>{offer.businessName}</Text>
            <Text style={styles.offerTitle}>{offer.title}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(offer.status) }]}>
            {offer.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.offerDescription}>{offer.description}</Text>

      <View style={styles.offerFooter}>
        <View style={styles.gemInfo}>
          <Ionicons name="diamond" size={14} color="#9D4EDD" />
          <Text style={styles.gemText}>{offer.gemsSpent} gems</Text>
          {offer.isRepeatPurchase && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>50% off</Text>
            </View>
          )}
        </View>
        <Text style={styles.dateText}>Purchased {offer.purchasedAt}</Text>
      </View>

      {offer.status === 'active' && (
        <TouchableOpacity
          style={styles.useButton}
          onPress={() => checkProximity(offer)}
        >
          <Ionicons name="qr-code" size={18} color="white" />
          <Text style={styles.useButtonText}>Use Offer</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Offers</Text>
        <Text style={styles.headerSubtitle}>
          {offers.filter((o) => o.status === 'active').length} active offers
        </Text>
      </View>

      {/* Offers List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {offers.map(renderOfferCard)}
      </ScrollView>

      {/* QR Modal */}
      {selectedOffer && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setSelectedOffer(null);
                setQrToken(null);
                setIsNearStore(false);
              }}
            >
              <Ionicons name="close" size={24} color="#8A9BB6" />
            </TouchableOpacity>

            {/* Offer Info */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="gift" size={28} color="#00DFA2" />
              </View>
              <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
              <Text style={styles.modalBusiness}>{selectedOffer.businessName}</Text>
            </View>

            {/* Status Content */}
            {checkingLocation ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0084FF" />
                <Text style={styles.loadingText}>Checking your location...</Text>
              </View>
            ) : isNearStore && qrToken ? (
              <View style={styles.qrContainer}>
                <View style={styles.nearBadge}>
                  <Ionicons name="location" size={16} color="#00DFA2" />
                  <Text style={styles.nearText}>You're near {selectedOffer.businessName}!</Text>
                </View>

                {/* QR Code Placeholder - In production use react-native-qrcode-svg */}
                <View style={styles.qrCode}>
                  <Ionicons name="qr-code" size={120} color="#0A0E16" />
                  <Text style={styles.qrToken}>{qrToken}</Text>
                </View>

                <Text style={styles.qrInstructions}>Show this QR code to staff</Text>
                <Text style={styles.qrExpiry}>Valid for 5 minutes</Text>
              </View>
            ) : (
              <View style={styles.farContainer}>
                <View style={styles.farIcon}>
                  <Ionicons name="location-outline" size={48} color="#FFC24C" />
                </View>
                <Text style={styles.farTitle}>You're too far away</Text>
                {distance && (
                  <Text style={styles.farDistance}>{formatDistance(distance)} from store</Text>
                )}
                <Text style={styles.farAddress}>{selectedOffer.businessLocation.address}</Text>

                <TouchableOpacity style={styles.directionsButton}>
                  <Ionicons name="navigate" size={18} color="white" />
                  <Text style={styles.directionsText}>Get Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => checkProximity(selectedOffer)}
                >
                  <Ionicons name="refresh" size={18} color="#0084FF" />
                  <Text style={styles.retryText}>Check Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Purchase Info */}
            <View style={styles.purchaseInfo}>
              <View style={styles.purchaseRow}>
                <Ionicons name="diamond" size={14} color="#9D4EDD" />
                <Text style={styles.purchaseLabel}>Purchased for</Text>
                <Text style={styles.purchaseValue}>{selectedOffer.gemsSpent} gems</Text>
              </View>
              {selectedOffer.isRepeatPurchase && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatText}>Repeat purchase - 50% gems saved!</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E16',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0A0E16',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8A9BB6',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offerCard: {
    backgroundColor: '#1B2432',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#00DFA2' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessName: {
    fontSize: 12,
    color: '#8A9BB6',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  offerDescription: {
    fontSize: 13,
    color: '#8A9BB6',
    marginBottom: 12,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemText: {
    fontSize: 13,
    color: '#9D4EDD',
    marginLeft: 4,
  },
  discountBadge: {
    backgroundColor: '#00DFA2' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 10,
    color: '#00DFA2',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#4B5C74',
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0084FF',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  useButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1B2432',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#00DFA2' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalBusiness: {
    fontSize: 14,
    color: '#8A9BB6',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#8A9BB6',
    marginTop: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  nearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00DFA2' + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  nearText: {
    color: '#00DFA2',
    marginLeft: 6,
    fontWeight: '500',
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrToken: {
    fontSize: 10,
    color: '#4B5C74',
    marginTop: 8,
  },
  qrInstructions: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  qrExpiry: {
    fontSize: 13,
    color: '#8A9BB6',
    marginTop: 4,
  },
  farContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  farIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFC24C' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  farTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  farDistance: {
    fontSize: 14,
    color: '#8A9BB6',
    marginBottom: 8,
  },
  farAddress: {
    fontSize: 13,
    color: '#4B5C74',
    textAlign: 'center',
    marginBottom: 20,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0084FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  directionsText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0084FF' + '15',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  retryText: {
    color: '#0084FF',
    fontWeight: '600',
    marginLeft: 8,
  },
  purchaseInfo: {
    backgroundColor: '#0A0E16',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchaseLabel: {
    color: '#8A9BB6',
    marginLeft: 6,
    flex: 1,
  },
  purchaseValue: {
    color: 'white',
    fontWeight: '600',
  },
  repeatBadge: {
    backgroundColor: '#00DFA2' + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  repeatText: {
    color: '#00DFA2',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MyOffersScreen;
