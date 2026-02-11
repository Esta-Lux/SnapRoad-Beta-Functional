// SnapRoad Mobile - Map Screen

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore, useOffersStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, MapConfig } from '../utils/theme';
import { GemDisplay } from '../components/ui';
import { Offer } from '../types';

const { width, height } = Dimensions.get('window');

export const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useUserStore();
  const { offers, selectOffer } = useOffersStore();
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const mapRef = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const handleOfferPress = (offer: Offer) => {
    setSelectedOffer(offer);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const closeOfferPanel = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedOffer(null));
  };

  const handleRecenter = () => {
    mapRef.current?.animateToRegion(MapConfig.initialRegion, 500);
  };

  const getOfferIcon = (type: string) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      gas: 'car',
      cafe: 'cafe',
      restaurant: 'restaurant',
      carwash: 'water',
      retail: 'bag',
    };
    return icons[type] || 'location';
  };

  const getOfferColor = (type: string) => {
    const colors: Record<string, string> = {
      gas: Colors.gas,
      cafe: Colors.cafe,
      restaurant: Colors.restaurant,
      carwash: Colors.carwash,
      retail: Colors.retail,
    };
    return colors[type] || Colors.primary;
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={MapConfig.initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {/* Offer Markers */}
        {offers.map((offer) => (
          <Marker
            key={offer.id}
            coordinate={{ latitude: offer.lat, longitude: offer.lng }}
            onPress={() => handleOfferPress(offer)}
          >
            <View style={[styles.markerContainer, { borderColor: getOfferColor(offer.businessType) }]}>
              <LinearGradient
                colors={[getOfferColor(offer.businessType), `${getOfferColor(offer.businessType)}cc`]}
                style={styles.marker}
              >
                <Ionicons name={getOfferIcon(offer.businessType)} size={16} color="#fff" />
              </LinearGradient>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{offer.discountPercent}%</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer?.()}>
          <Ionicons name="menu" size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchBar} onPress={() => setShowSearch(true)}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <Text style={styles.searchText}>Search destination...</Text>
        </TouchableOpacity>

        <GemDisplay amount={user.gems} size="sm" />
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleRecenter}>
          <Ionicons name="locate" size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.orionButton}>
          <LinearGradient colors={Colors.gradientAccent} style={styles.orionGradient}>
            <Ionicons name="mic" size={28} color={Colors.text} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="layers" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* User Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
          <Text style={styles.statText}>{user.safetyScore}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color={Colors.gold} />
          <Text style={styles.statText}>Lvl {user.level}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="speedometer" size={16} color={Colors.info} />
          <Text style={styles.statText}>{user.totalMiles.toFixed(0)} mi</Text>
        </View>
      </View>

      {/* Offer Panel */}
      {selectedOffer && (
        <Animated.View style={[styles.offerPanel, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.panelHandle} />
          
          <TouchableOpacity style={styles.closeButton} onPress={closeOfferPanel}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.offerHeader}>
            <View style={[styles.offerIcon, { backgroundColor: `${getOfferColor(selectedOffer.businessType)}20` }]}>
              <Ionicons name={getOfferIcon(selectedOffer.businessType)} size={28} color={getOfferColor(selectedOffer.businessType)} />
            </View>
            <View style={styles.offerInfo}>
              <Text style={styles.offerName}>{selectedOffer.businessName}</Text>
              <Text style={styles.offerDistance}>{selectedOffer.distance}</Text>
            </View>
            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>{selectedOffer.discountPercent}% OFF</Text>
            </View>
          </View>

          <Text style={styles.offerDescription}>{selectedOffer.description}</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="diamond" size={20} color={Colors.gem} />
              <Text style={styles.rewardText}>
                {user.isPremium ? selectedOffer.premiumGems : selectedOffer.baseGems} gems
              </Text>
            </View>
            {user.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color={Colors.gold} />
                <Text style={styles.premiumText}>Premium Bonus</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.navigateButton}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.navigateGradient}>
                <Ionicons name="navigate" size={20} color={Colors.text} />
                <Text style={styles.navigateText}>Navigate</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailsButton} onPress={() => {
              closeOfferPanel();
              navigation.navigate('OfferDetail', { offer: selectedOffer });
            }}>
              <Text style={styles.detailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// Dark map style for better visibility
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    width,
    height,
  },
  
  // Top Bar
  topBar: {
    position: 'absolute',
    top: 50,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },

  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  orionGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Bar
  statsBar: {
    position: 'absolute',
    bottom: 40,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  statText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceLight,
  },

  // Markers
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  discountText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },

  // Offer Panel
  offerPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: 4,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  offerIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  offerDistance: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  discountTag: {
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  discountTagText: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  offerDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    color: Colors.gem,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.md,
    gap: 4,
  },
  premiumText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  navigateButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  navigateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 8,
  },
  navigateText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  detailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  detailsText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
