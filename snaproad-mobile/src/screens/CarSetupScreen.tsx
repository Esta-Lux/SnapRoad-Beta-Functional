// SnapRoad Mobile - Car Setup Screen
// Select car type and color during onboarding

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, CarCategories, CarColors } from '../utils/theme';
import { Button } from '../components/ui';
import { useUserStore } from '../store';

const { width } = Dimensions.get('window');

interface CarSetupScreenProps {
  navigation: any;
}

type SetupStep = 'type' | 'color';

export const CarSetupScreen: React.FC<CarSetupScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<SetupStep>('type');
  const [selectedType, setSelectedType] = useState<string>('sedan');
  const [selectedColor, setSelectedColor] = useState<string>('ocean-blue');
  const { selectCar, completeOnboarding } = useUserStore();

  const handleNext = () => {
    if (step === 'type') {
      setStep('color');
    } else {
      selectCar(selectedType, `${selectedType}-classic`, selectedColor);
      completeOnboarding();
      navigation.replace('MainTabs');
    }
  };

  const handleBack = () => {
    if (step === 'color') {
      setStep('type');
    } else {
      navigation.goBack();
    }
  };

  const getCarIcon = (type: string) => {
    switch (type) {
      case 'sedan': return 'car-sport';
      case 'suv': return 'car';
      case 'truck': return 'bus';
      default: return 'car-sport';
    }
  };

  const selectedColorData = CarColors.find(c => c.id === selectedColor);

  const renderTypeSelection = () => (
    <View style={styles.selectionContainer}>
      <Text style={styles.stepTitle}>Choose Your Vehicle</Text>
      <Text style={styles.stepDescription}>
        Select the type that matches your ride
      </Text>

      <View style={styles.carTypesGrid}>
        {CarCategories.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[styles.carTypeCard, isSelected && styles.carTypeCardSelected]}
              onPress={() => setSelectedType(type.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.carTypeIcon, isSelected && styles.carTypeIconSelected]}>
                <Ionicons
                  name={getCarIcon(type.id)}
                  size={40}
                  color={isSelected ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <Text style={[styles.carTypeName, isSelected && styles.carTypeNameSelected]}>
                {type.name}
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color={Colors.text} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderColorSelection = () => {
    const standardColors = CarColors.filter(c => c.tier === 'standard');
    const metallicColors = CarColors.filter(c => c.tier === 'metallic');
    const premiumColors = CarColors.filter(c => c.tier === 'premium');

    const renderColorGrid = (colors: typeof CarColors, tierName: string) => (
      <View style={styles.colorTier}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>{tierName}</Text>
          {tierName !== 'Standard' && (
            <View style={styles.gemCost}>
              <Ionicons name="diamond" size={12} color={Colors.gem} />
              <Text style={styles.gemCostText}>
                {tierName === 'Metallic' ? '100-150' : '300-500'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.colorGrid}>
          {colors.map((color) => {
            const isSelected = selectedColor === color.id;
            return (
              <TouchableOpacity
                key={color.id}
                style={[styles.colorButton, isSelected && styles.colorButtonSelected]}
                onPress={() => setSelectedColor(color.id)}
              >
                <View style={[styles.colorSwatch, { backgroundColor: color.hex }]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={color.hex === '#F8FAFC' ? '#000' : '#fff'} />
                  )}
                </View>
                <Text style={styles.colorName} numberOfLines={1}>{color.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );

    return (
      <View style={styles.selectionContainer}>
        <Text style={styles.stepTitle}>Pick Your Color</Text>
        <Text style={styles.stepDescription}>
          Express yourself with your favorite color
        </Text>

        {/* Car Preview */}
        <View style={styles.carPreview}>
          <LinearGradient
            colors={[`${selectedColorData?.hex || Colors.primary}40`, 'transparent']}
            style={styles.carPreviewGlow}
          />
          <View style={[styles.carPreviewIcon, { backgroundColor: selectedColorData?.hex || Colors.primary }]}>
            <Ionicons name={getCarIcon(selectedType)} size={80} color="#fff" />
          </View>
          <Text style={styles.carPreviewName}>{selectedColorData?.name || 'Ocean Blue'}</Text>
        </View>

        <ScrollView style={styles.colorScroll} showsVerticalScrollIndicator={false}>
          {renderColorGrid(standardColors, 'Standard')}
          {renderColorGrid(metallicColors, 'Metallic')}
          {renderColorGrid(premiumColors, 'Premium')}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0a1929']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step === 'color' && styles.progressDotActive]} />
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 'type' ? renderTypeSelection() : renderColorSelection()}
        </View>

        {/* Bottom */}
        <View style={styles.bottomSection}>
          <Button
            title={step === 'color' ? 'Start Driving' : 'Continue'}
            onPress={handleNext}
            icon={step === 'color' ? 'car-sport' : 'arrow-forward'}
            size="lg"
          />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.surfaceLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  selectionContainer: {
    flex: 1,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  carTypesGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  carTypeCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  carTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  carTypeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  carTypeIconSelected: {
    backgroundColor: `${Colors.primary}20`,
  },
  carTypeName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  carTypeNameSelected: {
    color: Colors.text,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carPreview: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  carPreviewGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  carPreviewIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  carPreviewName: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  colorScroll: {
    flex: 1,
  },
  colorTier: {
    marginBottom: Spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tierName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gemCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gemCostText: {
    color: Colors.gem,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorButton: {
    alignItems: 'center',
    width: (width - Spacing.lg * 2 - Spacing.sm * 4) / 5,
  },
  colorButtonSelected: {
    transform: [{ scale: 1.1 }],
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  colorName: {
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
});

export default CarSetupScreen;
