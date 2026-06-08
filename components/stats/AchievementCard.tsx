import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Achievement } from '@/lib/hooks/use-stats';

interface AchievementCardProps {
  achievement: Achievement;
}

export const AchievementCard = React.memo<AchievementCardProps>(({ achievement }) => {
  const { title, description, emoji, isUnlocked, unlockedAt } = achievement;

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isUnlocked ? '#FFFFFF' : '#F7F6F3',
          borderColor: isUnlocked ? '#E8E7E3' : '#F2F1EE',
          opacity: isUnlocked ? 1 : 0.55,
        },
      ]}
    >
      {/* Icon Area */}
      <View style={styles.iconRow}>
        <Text style={[styles.emoji, !isUnlocked && styles.lockedEmoji]}>
          {emoji}
        </Text>
        {isUnlocked && (
          <View style={styles.mintBadge}>
            <Text style={styles.mintBadgeText}>Unlocked ✓</Text>
          </View>
        )}
      </View>

      {/* Info Area */}
      <View style={styles.infoArea}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        {isUnlocked && unlockedAt && (
          <Text style={styles.dateText}>{formatDateStr(unlockedAt)}</Text>
        )}
      </View>

      {/* Locked overlay lock icon */}
      {!isUnlocked && (
        <View style={styles.lockOverlay}>
          <Lock size={12} color="#9B9BAF" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '48%', // Fits two columns side-by-side with padding
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 125,
    position: 'relative',
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  emoji: {
    fontSize: 28,
  },
  lockedEmoji: {
    opacity: 0.25,
  },
  mintBadge: {
    backgroundColor: '#E6F9F3',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mintBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 8,
    color: '#00B894',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoArea: {
    marginTop: 10,
    gap: 2,
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  description: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    lineHeight: 14,
  },
  dateText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    marginTop: 4,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
});
export default AchievementCard;
