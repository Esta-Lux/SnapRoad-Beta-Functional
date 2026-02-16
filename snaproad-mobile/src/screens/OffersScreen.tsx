// SnapRoad Mobile - Offers Screen
// Browse and filter local offers

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, GemDisplay, Badge } from '../components/ui';
import { useOffersStore, useUserStore } from '../store';
import { Offer } from '../types';

const { width } = Dimensions.get('window');

interface OffersScreenProps {
  navigation: any;
}

const categories = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'gas', label: 'Gas', icon: 'car' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe' },
  { id: 'restaurant', label: 'Food', icon: 'restaurant' },
  { id: 'carwash', label: 'Car Wash', icon: 'water' },
  { id: 'retail', label: 'Retail', icon: 'bag' },
];

export const OffersScreen: React.FC<OffersScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { offers } = useOffersStore();
  const { user } = useUserStore();

  const filteredOffers = selectedCategory === 'all'
    ? offers
    : offers.filter(o => o.businessType === selectedCategory);

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

  const renderCategory = ({ item }: { item: typeof categories[0] }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
        onPress={() => setSelectedCategory(item.id)}
      >
        <View style={[styles.categoryIcon, isSelected && styles.categoryIconActive]}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={isSelected ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOffer = ({ item }: { item: Offer }) => {
    const gemsCost = user.isPremium ? item.premiumGems : item.baseGems;
    const color = getOfferColor(item.businessType);

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => navigation.navigate('OfferDetail', { offer: item })}
        activeOpacity={0.8}
      >
        <View style={styles.offerContent}>
          <View style={[styles.offerIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={getOfferIcon(item.businessType)} size={28} color={color} />
          </View>
          
          <View style={styles.offerInfo}>
            <Text style={styles.offerName}>{item.businessName}</Text>
            <Text style={styles.offerDescription} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.offerMeta}>
              <View style={styles.distanceTag}>
                <Ionicons name="location" size={12} color={Colors.textSecondary} />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
              <View style={styles.gemsTag}>
                <Ionicons name="diamond" size={12} color={Colors.gem} />
                <Text style={styles.gemsText}>{gemsCost}</Text>
              </View>
            </View>
          </View>

          <View style={styles.discountContainer}>
            <LinearGradient colors={[color, `${color}cc`]} style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discountPercent}%</Text>
              <Text style={styles.discountLabel}>OFF</Text>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Local Offers</Text>
          <Text style={styles.headerSubtitle}>
            {filteredOffers.length} offers near you
          </Text>
        </View>
        <GemDisplay amount={user.gems} />
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <Text style={styles.searchPlaceholder}>Search offers...</Text>
        <View style={styles.filterButton}>
          <Ionicons name="options" size={18} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Categories */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />

      {/* Featured Banner */}
      <TouchableOpacity style={styles.featuredBanner}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.featuredGradient}
        >
          <View style={styles.featuredContent}>
            <Ionicons name="flash" size={24} color={Colors.gold} />
            <View style={styles.featuredText}>
              <Text style={styles.featuredTitle}>Premium Members Save More!</Text>
              <Text style={styles.featuredSubtitle}>Get 2x gems on every offer</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Offers List */}
      <FlatList
        data={filteredOffers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.offersList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No offers found</Text>
            <Text style={styles.emptyDescription}>
              Try changing the category or check back later
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryTab: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  categoryTabActive: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryIconActive: {
    backgroundColor: `${Colors.primary}20`,
  },
  categoryLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  categoryLabelActive: {
    color: Colors.primary,
  },
  featuredBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  featuredSubtitle: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    opacity: 0.8,
  },
  offersList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  offerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  offerIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  offerName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  offerDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 8,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  gemsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.gem}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gemsText: {
    color: Colors.gem,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  discountContainer: {
    marginLeft: Spacing.sm,
  },
  discountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  discountText: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  discountLabel: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    opacity: 0.9,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
  },
  emptyDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default OffersScreen;
