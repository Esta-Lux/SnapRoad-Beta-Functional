// SnapRoad Mobile - Settings Screen
// Aligned with /app/frontend/src/components/figma-ui/mobile/Settings.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

interface SettingsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor = Colors.primary,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (showChevron && onPress && (
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    ))}
  </TouchableOpacity>
);

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  
  // Settings state
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [autoStartTrip, setAutoStartTrip] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('profile');
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleNavigate = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else if (navigation) {
      navigation.navigate(screen);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <SettingSection title="Account">
          <SettingItem
            icon="person-outline"
            title="Account Info"
            subtitle="Name, email, phone"
            onPress={() => handleNavigate('AccountInfo')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Center"
            subtitle="Data, permissions, preferences"
            iconColor={Colors.success}
            onPress={() => handleNavigate('PrivacyCenter')}
          />
          <SettingItem
            icon="diamond-outline"
            title="Subscription"
            subtitle="Premium - Active"
            iconColor={Colors.accent}
            onPress={() => handleNavigate('Pricing')}
          />
        </SettingSection>

        {/* Appearance Section */}
        <SettingSection title="Appearance">
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            iconColor={Colors.primary}
            showChevron={false}
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor={Colors.text}
              />
            }
          />
          <SettingItem
            icon="color-palette-outline"
            title="Theme Color"
            subtitle="Sky Blue"
            iconColor={Colors.primary}
            onPress={() => {}}
          />
        </SettingSection>

        {/* Navigation Section */}
        <SettingSection title="Navigation & Maps">
          <SettingItem
            icon="location-outline"
            title="Location Tracking"
            subtitle="Background tracking enabled"
            iconColor={Colors.success}
            showChevron={false}
            rightElement={
              <Switch
                value={locationTracking}
                onValueChange={setLocationTracking}
                trackColor={{ false: Colors.surfaceLight, true: Colors.success }}
                thumbColor={Colors.text}
              />
            }
          />
          <SettingItem
            icon="car-outline"
            title="Auto-Start Trips"
            subtitle="Start recording when driving"
            showChevron={false}
            rightElement={
              <Switch
                value={autoStartTrip}
                onValueChange={setAutoStartTrip}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor={Colors.text}
              />
            }
          />
          <SettingItem
            icon="map-outline"
            title="Map Style"
            subtitle="Dark"
            onPress={() => {}}
          />
          <SettingItem
            icon="navigate-outline"
            title="Navigation Voice"
            subtitle="English (US)"
            onPress={() => {}}
          />
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            iconColor={Colors.warning}
            showChevron={false}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.surfaceLight, true: Colors.warning }}
                thumbColor={Colors.text}
              />
            }
          />
          <SettingItem
            icon="mail-outline"
            title="Email Notifications"
            subtitle="Weekly summary"
            onPress={() => handleNavigate('notifications-settings')}
          />
        </SettingSection>

        {/* Sound & Haptics Section */}
        <SettingSection title="Sound & Haptics">
          <SettingItem
            icon="volume-high-outline"
            title="Sound Effects"
            showChevron={false}
            rightElement={
              <Switch
                value={soundEffects}
                onValueChange={setSoundEffects}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor={Colors.text}
              />
            }
          />
          <SettingItem
            icon="phone-portrait-outline"
            title="Haptic Feedback"
            showChevron={false}
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor={Colors.text}
              />
            }
          />
        </SettingSection>

        {/* Storage Section */}
        <SettingSection title="Storage">
          <SettingItem
            icon="folder-outline"
            title="Storage Usage"
            subtitle="128 MB used"
            onPress={() => {}}
          />
          <SettingItem
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up space"
            iconColor={Colors.error}
            onPress={() => {}}
          />
        </SettingSection>

        {/* Support Section */}
        <SettingSection title="Support">
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => handleNavigate('Help')}
          />
          <SettingItem
            icon="chatbubble-outline"
            title="Contact Support"
            onPress={() => {}}
          />
          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => handleNavigate('TermsOfService')}
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Privacy Policy"
            onPress={() => handleNavigate('PrivacyPolicy')}
          />
        </SettingSection>

        {/* About Section */}
        <SettingSection title="About">
          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="2.1.0 (Build 2024)"
            showChevron={false}
          />
          <SettingItem
            icon="star-outline"
            title="Rate the App"
            iconColor={Colors.warning}
            onPress={() => {}}
          />
          <SettingItem
            icon="share-outline"
            title="Share with Friends"
            onPress={() => {}}
          />
        </SettingSection>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          SnapRoad v2.1.0{'\n'}
          Made with care for safer roads
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundLight,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.error}15`,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  logoutText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
});

export default SettingsScreen;
