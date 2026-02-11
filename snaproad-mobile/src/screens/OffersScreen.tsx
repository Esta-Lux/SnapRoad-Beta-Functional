// SnapRoad Mobile - Offers Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOffersStore, useUserStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, Badge, GemDisplay } from '../components/ui';
import { Offer } from '../types';

const OFFER_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'gas', label: 'Gas', icon: 'car' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe' },
  { id: 'restaurant', label: 'Food', icon: 'restaurant' },
  { id: 'carwash', label: 'Car Wash', icon: 'water' },
  { id: 'retail', label: 'Retail', icon: 'bag' },
];

export const OffersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { offers } = useOffersStore();
  const { user } = useUserStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredOffers = selectedCategory === 'all'
    ? offers
    : offers.filter((o) => o.businessType === selectedCategory);

  const getOfferIcon = (type: string): keyof typeof Ionicons.glyphMap => {
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

  const renderOffer = ({ item }: { item: Offer }) => (
    <TouchableOpacity
      style={styles.offerCard}
      onPress={() => navigation.navigate('OfferDetail', { offer: item })}
    >
      <View style={styles.offerCardContent}>
        <View style={[styles.offerIcon, { backgroundColor: `${getOfferColor(item.businessType)}20` }]}>
          <Ionicons name={getOfferIcon(item.businessType)} size={24} color={getOfferColor(item.businessType)} />
        </View>

        <View style={styles.offerInfo}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerName} numberOfLines={1}>{item.businessName}</Text>
            {user.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={10} color={Colors.gold} />
              </View>
            )}
          </View>
          <Text style={styles.offerDescription} numberOfLines={1}>{item.description}</Text>
          <View style={styles.offerMeta}>
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={12} color={Colors.textSecondary} />
              <Text style={styles.distanceText}>{item.distance}</Text>
            </View>
            <View style={styles.gemBadge}>
              <Ionicons name="diamond" size={12} color={Colors.gem} />
              <Text style={styles.gemText}>
                {user.isPremium ? item.premiumGems : item.baseGems}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.discountContainer}>
          <LinearGradient
            colors={[getOfferColor(item.businessType), `${getOfferColor(item.businessType)}cc`]}
            style={styles.discountBadge}
          >
            <Text style={styles.discountText}>{item.discountPercent}%</Text>
            <Text style={styles.discountLabel}>OFF</Text>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Offers</Text>
        <GemDisplay amount={user.gems} />
      </View>

      {/* Premium Banner */}
      {!user.isPremium && (
        <TouchableOpacity style={styles.premiumBanner}>
          <LinearGradient
            colors={Colors.gradientGold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumGradient}
          >
            <View style={styles.premiumContent}>
              <Ionicons name="star" size={24} color={Colors.background} />
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>Get 2x gems on every offer!</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.background} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {OFFER_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.id ? Colors.text : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Offers List */}
      <FlatList
        data={filteredOffers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No offers found</Text>
            <Text style={styles.emptySubtitle}>Try a different category</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },

  // Premium Banner
  premiumBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  premiumText: {},
  premiumTitle: {
    color: Colors.background,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  premiumSubtitle: {
    color: Colors.background,
    fontSize: FontSizes.sm,
    opacity: 0.8,
  },

  // Categories
  categoriesContainer: {
    marginBottom: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  categoryTextActive: {
    color: Colors.text,
  },

  // Offers List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  offerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  offerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  offerIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  offerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
  premiumBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${Colors.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: Spacing.md,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  gemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gemText: {
    color: Colors.gem,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  discountContainer: {
    alignItems: 'flex-end',
  },
  discountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  discountText: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  discountLabel: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    opacity: 0.8,
  },

  // Empty State
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
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginTop: 4,
  },
});
