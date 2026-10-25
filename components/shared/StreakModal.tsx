import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Flame, X, ShieldCheck, Shield, Trophy, Calendar, ArrowRight, Zap, Check, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { AdRewarded } from '@/components/ads';
import { getStreakShieldCount, setStreakShieldCount, MAX_STREAK_SHIELDS } from '@/lib/utils/focus-rewards';

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
  const queryClient = useQueryClient();
  const [shieldsCount, setShieldsCount] = useState<number>(1);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      getStreakShieldCount().then((count) => setShieldsCount(count));
    }
  }, [isVisible]);

  const handleRestoreStreak = async () => {
    if (isRestoring || shieldsCount <= 0) return;
    setIsRestoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Please Sign In', 'You need to be logged in to restore your streak.');
        return;
      }

      // Get user's active habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      const habitId = habits?.[0]?.id;
      if (!habitId) {
        Alert.alert('No Active Habit', 'Please create at least one habit first so we can restore your streak.');
        return;
      }

      // Yesterday's date in local YYYY-MM-DD
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
      const dd = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yyyy}-${mm}-${dd}`;

      // 1. Deduct 1 shield
      const nextShields = Math.max(0, shieldsCount - 1);
      setShieldsCount(nextShields);
      await setStreakShieldCount(nextShields);

      // 2. Mark yesterday as protected
      await supabase
        .from('habit_logs')
        .upsert(
          {
            habit_id: habitId,
            user_id: user.id,
            date: yesterdayStr,
            done: true,
          },
          { onConflict: 'habit_id,date' }
        );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['profileHabitStreak'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      Alert.alert(
        '🔥 Streak Restored!',
        `1 Streak Shield was used to restore yesterday's missed day.\n\nYour streak is protected! Keep the momentum going today.`,
        [{ text: 'Awesome!' }]
      );
    } catch {
      Alert.alert('Error', 'Could not restore streak. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClaimAdShield = () => {
    if (isClaiming || shieldsCount >= MAX_STREAK_SHIELDS) return;
    setIsClaiming(true);
    AdRewarded.showRewardAd(async () => {
      const nextCount = shieldsCount + 1;
      setShieldsCount(nextCount);
      await setStreakShieldCount(nextCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsClaiming(false);
    });
  };

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
                <Text style={styles.statVal}>{streakCount > 0 ? `${streakCount} Days` : '1 Day'}</Text>
                <Text style={styles.statLabel}>Best Record</Text>
              </View>

              <View style={styles.statBox}>
                <ShieldCheck size={18} color="#00B894" />
                <Text style={styles.statVal}>{shieldsCount} Active</Text>
                <Text style={styles.statLabel}>Streak Protection</Text>
              </View>
            </View>

            {/* Streak Shield Status / 1-Tap Restore Card */}
            {streakCount === 0 && shieldsCount > 0 ? (
              <View style={styles.restoreCard}>
                <View style={styles.restoreHeader}>
                  <Flame size={20} color="#E8A020" fill="#E8A020" />
                  <Text style={styles.restoreTitle}>Streak Broken? Restore with Shield</Text>
                </View>
                <Text style={styles.restoreDesc}>
                  You have {shieldsCount} active {shieldsCount === 1 ? 'shield' : 'shields'}. You can use 1 shield now to recover yesterday's missed day and bring your streak back alive!
                </Text>
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={handleRestoreStreak}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={16} color="#FFFFFF" />
                  <Text style={styles.restoreBtnText}>
                    {isRestoring ? 'Restoring...' : 'Restore Streak (Uses 1 Shield) 🛡️'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.shieldInfoCard}>
                <ShieldCheck size={20} color="#00B894" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.shieldInfoTitle}>
                    {shieldsCount > 0 ? 'Automatic Streak Insurance Active' : 'No Streak Shields Active'}
                  </Text>
                  <Text style={styles.shieldInfoDesc}>
                    {shieldsCount > 0
                      ? `Your ${shieldsCount} active ${shieldsCount === 1 ? 'shield automatically absorbs' : 'shields automatically absorb'} a missed day. No manual action needed — your streak is protected!`
                      : 'You have 0 shields remaining. Get a free shield below so your streak never resets to zero if you miss a day.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Rewarded Ad Free Shield Banner */}
            {shieldsCount < MAX_STREAK_SHIELDS && (
              <TouchableOpacity
                style={styles.adShieldCard}
                onPress={handleClaimAdShield}
                disabled={isClaiming}
                activeOpacity={0.8}
              >
                <View style={styles.adShieldLeft}>
                  <Shield size={22} color="#0284C7" fill="rgba(2, 132, 199, 0.18)" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.adShieldTitle}>Protect Your Daily Streak</Text>
                    <Text style={styles.adShieldSub}>
                      {shieldsCount} of {MAX_STREAK_SHIELDS} shields active · Watch ad to get +1
                    </Text>
                  </View>
                </View>
                <View style={styles.adShieldBadge}>
                  <Text style={styles.adShieldBadgeText}>
                    {isClaiming ? 'Loading...' : '+1 Free 🎬'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

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
  adShieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 14,
  },
  adShieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  adShieldTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  adShieldSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#0284C7',
    marginTop: 1,
  },
  adShieldBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  adShieldBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  restoreCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  restoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  restoreTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  restoreDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
    marginBottom: 12,
  },
  restoreBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  restoreBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shieldInfoCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  shieldInfoTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  shieldInfoDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#15803D',
    lineHeight: 16,
    marginTop: 2,
  },
});
