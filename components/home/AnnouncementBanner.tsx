import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAnnouncements } from '@/lib/hooks/use-announcements';
import * as Haptics from 'expo-haptics';

export const AnnouncementBanner = React.memo(() => {
  const { activeAnnouncement, dismissAnnouncement } = useAnnouncements();

  if (!activeAnnouncement) {
    return null;
  }

  const { id, title, message, severity, target_category } = activeAnnouncement;

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dismissAnnouncement(id);
  };

  const isCritical = severity === 'critical';
  const isWarning = severity === 'warning';

  const icon = isCritical ? '🚨' : isWarning ? '⚠️' : '📢';

  return (
    <View
      style={[
        styles.bannerContainer,
        isCritical && styles.criticalContainer,
        isWarning && styles.warningContainer,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.textContent}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.headline,
              isCritical && styles.criticalText,
              isWarning && styles.warningText,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {target_category && target_category !== 'all' && (
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>{target_category.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.messageText} numberOfLines={2} ellipsizeMode="tail">
          {message}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        activeOpacity={0.7}
        accessibilityLabel="Dismiss announcement"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  criticalContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
  },
  iconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    lineHeight: 24,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headline: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  criticalText: {
    color: '#B91C1C',
  },
  warningText: {
    color: '#B45309',
  },
  targetBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  targetBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  dismissButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
