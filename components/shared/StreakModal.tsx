import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Flame, X, ShieldCheck, Trophy, Calendar, ArrowRight, Zap, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';

interface StreakModalProps {
  isVisible: boolean;
  streakCount: number;
  weeklyActivity?: boolean[];
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const StreakModal: React.FC<StreakModalProps> = ({
  isVisible,
  streakCount,
  weeklyActivity,
  onClose,
}) => {
  const handleAction = async (target: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onClose();
    setTimeout(() => {
      router.push(target as Href);
    }, 150);
  };

  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#9B9BAF" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Flame Icon Badge */}
            <View style={styles.flameBadgeContainer}>
              <Flame size={44} color="#E8A020" fill="#E8A020" />
            </View>

            <Text style={styles.streakNumber}>{streakCount} Day Streak!</Text>
            <Text style={styles.subtitle}>
              {streakCount > 0
                ? "You're building incredible consistency! Keep it up today."
                : 'Start your daily streak today by completing your first habit!'}
            </Text>

            {/* Weekly Calendar Heatmap Row */}
            <View style={styles.weeklyCard}>
              <View style={styles.weeklyHeader}>
                <Calendar size={14} color="#5B4FE8" />
                <Text style={styles.weeklyTitle}>This Week's Activity</Text>
              </View>

              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day, idx) => {
                  const isToday = idx === currentDayIndex;
                  let isCompleted = false;

                  if (weeklyActivity && Array.isArray(weeklyActivity) && weeklyActivity.length === 7) {
                    isCompleted = !!weeklyActivity[idx];
                  } else if (streakCount > 0) {
                    const startStreakIdx = Math.max(0, currentDayIndex - streakCount + 1);
                    isCompleted = idx >= startStreakIdx && idx <= currentDayIndex;
                  }

                  return (
                    <View key={day} style={styles.dayCol}>
                      <View
                        style={[
                          styles.dayCircle,
                          isCompleted && styles.dayCircleCompleted,
                          isToday && !isCompleted && styles.dayCircleToday,
                        ]}
                      >
                        {isCompleted ? (
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        ) : (
                          <Text
                            style={[
                              styles.dayCircleText,
                              isToday && styles.dayCircleTextToday,
                            ]}
                          >
                            {idx + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.dayLabel,
                          isToday && styles.dayLabelToday,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Stats Overview Pill */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Trophy size={18} color="#E8A020" />
                <Text style={styles.statVal}>{Math.max(streakCount, 7)} Days</Text>
                <Text style={styles.statLabel}>Best Record</Text>
              </View>

              <View style={styles.statBox}>
                <ShieldCheck size={18} color="#00B894" />
                <Text style={styles.statVal}>Active</Text>
                <Text style={styles.statLabel}>Streak Protection</Text>
              </View>
            </View>

            {/* Motivational Quote */}
            <View style={styles.tipBox}>
              <Zap size={14} color="#5B4FE8" style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success."
              </Text>
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleAction('/habits')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Log Today's Habits</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handleAction('/(tabs)/stats')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>View Detailed Statistics</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    padding: 24,
    position: 'relative',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
    padding: 4,
    backgroundColor: '#F7F6F3',
    borderRadius: 14,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  flameBadgeContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FEF3DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  streakNumber: {
    fontFamily: 'InstrumentSerif',
    fontSize: 30,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  weeklyCard: {
    width: '100%',
    backgroundColor: '#F7F6F3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  weeklyTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#17172A',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#5B4FE8',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#5B4FE8',
    backgroundColor: '#FFFFFF',
  },
  dayCircleText: {
    fontFamily: 'DMMono',
    fontSize: 11,
    color: '#9B9BAF',
  },
  dayCircleTextToday: {
    color: '#5B4FE8',
    fontWeight: '700',
  },
  dayLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
  },
  dayLabelToday: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F7F6F3',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '700',
    color: '#17172A',
  },
  statLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
  },
  tipBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EAE8FD',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 18,
  },
  tipText: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#5B4FE8',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  primaryBtn: {
    backgroundColor: '#5B4FE8',
    height: 48,
    borderRadius: 14,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
});
