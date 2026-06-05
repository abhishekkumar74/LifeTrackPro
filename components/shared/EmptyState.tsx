import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Icons from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';

// Ensure the icon matches one of Lucide's exported icon names
export type IconName = keyof typeof Icons;

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  // Safe dynamic icon resolution
  const LucideIcon = (Icons[icon] || Icons.HelpCircle) as React.ComponentType<{
    size?: number;
    color?: string;
  }>;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <LucideIcon size={32} color={COLORS.violet} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.bg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.sizes.xl,
    color: COLORS.t1,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.t2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.violet,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    minHeight: 48, // Accessibility minimum touch target standard
    // Shadow properties for iOS
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow property for Android
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.surface,
  },
});

export default EmptyState;
