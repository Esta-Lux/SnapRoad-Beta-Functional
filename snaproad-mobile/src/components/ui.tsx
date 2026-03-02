// SnapRoad Mobile - Reusable Components

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

// ============== BUTTON ==============
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
}) => {
  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 24 },
    lg: { paddingVertical: 16, paddingHorizontal: 32 },
  };

  const textSizes = {
    sm: FontSizes.sm,
    md: FontSizes.md,
    lg: FontSizes.lg,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={style}>
        <LinearGradient
          colors={disabled ? ['#475569', '#334155'] : Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, sizeStyles[size], disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <View style={styles.buttonContent}>
              {icon && <Ionicons name={icon} size={textSizes[size] + 2} color={Colors.text} style={{ marginRight: 8 }} />}
              <Text style={[styles.buttonText, { fontSize: textSizes[size] }]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.buttonOutline, sizeStyles[size], disabled && styles.disabled, style]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View style={styles.buttonContent}>
            {icon && <Ionicons name={icon} size={textSizes[size] + 2} color={Colors.primary} style={{ marginRight: 8 }} />}
            <Text style={[styles.buttonTextOutline, { fontSize: textSizes[size] }]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.buttonGhost, sizeStyles[size], disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textSecondary} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Ionicons name={icon} size={textSizes[size] + 2} color={Colors.textSecondary} style={{ marginRight: 8 }} />}
          <Text style={[styles.buttonTextGhost, { fontSize: textSizes[size] }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============== CARD ==============
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

// ============== BADGE ==============
interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const variantStyles: Record<string, { bg: string; text: string }> = {
    default: { bg: Colors.surfaceLight, text: Colors.textSecondary },
    success: { bg: `${Colors.success}20`, text: Colors.success },
    warning: { bg: `${Colors.warning}20`, text: Colors.warning },
    error: { bg: `${Colors.error}20`, text: Colors.error },
    info: { bg: `${Colors.info}20`, text: Colors.info },
    premium: { bg: `${Colors.gold}20`, text: Colors.gold },
  };

  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.badgeText, { color: text }, size === 'md' && styles.badgeTextMd]}>{label}</Text>
    </View>
  );
};

// ============== PROGRESS BAR ==============
interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Colors.primary,
  height = 8,
  showLabel = false,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressTrack, { height }]}>
        <LinearGradient
          colors={[color, Colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${clampedProgress * 100}%`, height }]}
        />
      </View>
      {showLabel && (
        <Text style={styles.progressLabel}>{Math.round(clampedProgress * 100)}%</Text>
      )}
    </View>
  );
};

// ============== STAT CARD ==============
interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = Colors.primary,
  trend,
}) => {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend && (
        <Text style={[styles.statTrend, { color: trend.startsWith('+') ? Colors.success : Colors.error }]}>
          {trend}
        </Text>
      )}
    </View>
  );
};

// ============== GEM DISPLAY ==============
interface GemDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
}

export const GemDisplay: React.FC<GemDisplayProps> = ({ amount, size = 'md' }) => {
  const sizes = {
    sm: { icon: 14, text: FontSizes.sm },
    md: { icon: 18, text: FontSizes.md },
    lg: { icon: 24, text: FontSizes.xl },
  };

  return (
    <View style={styles.gemContainer}>
      <Ionicons name="diamond" size={sizes[size].icon} color={Colors.gem} />
      <Text style={[styles.gemText, { fontSize: sizes[size].text }]}>{amount.toLocaleString()}</Text>
    </View>
  );
};

// ============== AVATAR ==============
interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  showLevel?: boolean;
  level?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 48,
  showLevel = false,
  level,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ position: 'relative' }}>
      <LinearGradient
        colors={Colors.gradientPrimary}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
      </LinearGradient>
      {showLevel && level && (
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      )}
    </View>
  );
};

// ============== SECTION HEADER ==============
interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, onAction }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============== EMPTY STATE ==============
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={48} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" style={{ marginTop: 16 }} />
      )}
    </View>
  );
};

// ============== STYLES ==============
const styles = StyleSheet.create({
  // Button
  button: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontWeight: FontWeights.semibold,
  },
  buttonOutline: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextOutline: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  buttonGhost: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextGhost: {
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  disabled: {
    opacity: 0.5,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.text}10`,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  badgeTextMd: {
    fontSize: FontSizes.sm,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    marginLeft: 8,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },

  // Stat Card
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 100,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
  statTrend: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    marginTop: 4,
  },

  // Gem
  gemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gem}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  gemText: {
    color: Colors.gem,
    fontWeight: FontWeights.bold,
    marginLeft: 6,
  },

  // Avatar
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.text,
    fontWeight: FontWeights.bold,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.gold,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: 8,
  },
  emptyDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    maxWidth: 280,
  },
});
