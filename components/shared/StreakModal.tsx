import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Flame,
  X,
  ShieldCheck,
  Shield,
  Trophy,
  ArrowRight,
  Zap,
  Check,
  RotateCcw,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { AdRewarded } from '@/components/ads';
import {
  getStreakShieldCount,
  setStreakShieldCount,
  MAX_STREAK_SHIELDS,
} from '@/lib/utils/focus-rewards';
import { useAuthStore } from '@/lib/store/auth.store';

interface StreakModalProps {
  isVisible: boolean;
  streakCount: number;
  bestStreak?: number;
  isStreakBroken?: boolean;
  canRestoreYesterday?: boolean;
  previousStreak?: number;
  isTodayCompleted?: boolean;
  weeklyActivity?: boolean[];
  onClose: () => void;
  onRestored?: () => void;
}

const XP_RESTORE_COST = 50;
const XP_SHIELD_BUY_COST = 100;

export const StreakModal: React.FC<StreakModalProps> = ({
  isVisible,
  streakCount,
  bestStreak = 1,
  isStreakBroken = false,
  canRestoreYesterday = false,
  previousStreak = 0,
  isTodayCompleted = false,
  onClose,
  onRestored,
}) => {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const deductXp = useAuthStore((s) => s.deductXp);
  const currentXp = Number(profile?.xp_points || 0);

  const [shieldsCount, setShieldsCount] = useState<number>(1);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoringAction, setRestoringAction] = useState<'ad' | 'xp' | 'shield' | null>(null);
  const [isClaimingShield, setIsClaimingShield] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      getStreakShieldCount().then((count) => setShieldsCount(count));
    }
  }, [isVisible]);

  // Core helper to mark yesterday as active in Supabase habit_logs
  const restoreYesterdayActivity = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Please Sign In', 'You need to be logged in to restore your streak.');
      return false;
    }

    // 1. Get or auto-create a habit so restore never fails
    let habitId: string | null = null;
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (habits && habits.length > 0) {
      habitId = habits[0].id;
    } else {
      const { data: newHabit, error: createError } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          title: 'Daily Streak Maintained',
          category: 'General',
          frequency: 'daily',
          is_active: true,
        })
        .select('id')
        .single();

      if (createError || !newHabit) {
        throw new Error('Failed to create recovery habit');
      }
      habitId = newHabit.id;
    }

    // 2. Yesterday's date in local YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yyyy}-${mm}-${dd}`;

    // 3. Upsert yesterday's habit log
    const { error: logError } = await supabase
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

    if (logError) throw logError;

    // 4. Invalidate all query caches
    queryClient.invalidateQueries({ queryKey: ['todayStats'] });
    queryClient.invalidateQueries({ queryKey: ['profileHabitStreak'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['habits'] });

    return true;
  };

  // 1. Restore streak via Rewarded Ad
  const handleRestoreWithAd = () => {
    if (isRestoring) return;
    setIsRestoring(true);
    setRestoringAction('ad');

    AdRewarded.showRewardAd(async () => {
      try {
        const ok = await restoreYesterdayActivity();
        if (ok) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onRestored?.();
          Alert.alert(
            'Streak Restored!',
            'You successfully revived your streak by watching an ad. Keep your momentum going today!',
            [{ text: 'Awesome!', onPress: onClose }]
          );
        }
      } catch {
        Alert.alert('Error', 'Could not restore streak. Please try again.');
      } finally {
        setIsRestoring(false);
        setRestoringAction(null);
      }
    });
  };

  // 2. Restore streak via XP Points
  const handleRestoreWithXp = async () => {
    if (isRestoring) return;

    if (currentXp < XP_RESTORE_COST) {
      Alert.alert(
        'Not Enough XP',
        `You need ${XP_RESTORE_COST} XP to restore your streak. You currently have ${currentXp} XP.\n\nYou can watch a free ad instead!`,
        [
          { text: 'Watch Ad (Free)', onPress: handleRestoreWithAd },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsRestoring(true);
    setRestoringAction('xp');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Please Sign In', 'You need to be logged in to restore your streak.');
        return;
      }

      // Deduct XP in Zustand
      const deducted = deductXp(XP_RESTORE_COST);
      if (!deducted) {
        Alert.alert('Error', 'Could not deduct XP. Please try again.');
        return;
      }

      // Sync XP in Supabase profiles
      const newXp = Math.max(0, currentXp - XP_RESTORE_COST);
      await supabase.from('profiles').update({ xp_points: newXp }).eq('id', user.id);

      const ok = await restoreYesterdayActivity();
      if (ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRestored?.();
        Alert.alert(
          'Streak Restored!',
          `Used ${XP_RESTORE_COST} XP to revive yesterday's missed day. Streak is active!`,
          [{ text: 'Awesome!', onPress: onClose }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to restore streak with XP.');
    } finally {
      setIsRestoring(false);
      setRestoringAction(null);
    }
  };

  // 3. Restore streak via 1 Shield
  const handleRestoreWithShield = async () => {
    if (isRestoring || shieldsCount <= 0) return;
    setIsRestoring(true);
    setRestoringAction('shield');

    try {
      const nextShields = Math.max(0, shieldsCount - 1);
      setShieldsCount(nextShields);
      await setStreakShieldCount(nextShields);

      const ok = await restoreYesterdayActivity();
      if (ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRestored?.();
        Alert.alert(
          'Streak Restored!',
          `1 Streak Shield used to recover yesterday's missed day. You have ${nextShields} shields remaining!`,
          [{ text: 'Awesome!', onPress: onClose }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to restore streak with shield.');
    } finally {
      setIsRestoring(false);
      setRestoringAction(null);
    }
  };

  // Earning / Buying shields
  const handleClaimAdShield = () => {
    if (isClaimingShield || shieldsCount >= MAX_STREAK_SHIELDS) return;
    setIsClaimingShield(true);

    AdRewarded.showRewardAd(async () => {
      const nextCount = Math.min(MAX_STREAK_SHIELDS, shieldsCount + 1);
      setShieldsCount(nextCount);
      await setStreakShieldCount(nextCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsClaimingShield(false);
      Alert.alert('Shield Earned!', `You now have ${nextCount} / ${MAX_STREAK_SHIELDS} active shields.`);
    });
  };

  const handleBuyShieldWithXp = async () => {
    if (isClaimingShield || shieldsCount >= MAX_STREAK_SHIELDS) return;

    if (currentXp < XP_SHIELD_BUY_COST) {
      Alert.alert(
        'Not Enough XP',
        `You need ${XP_SHIELD_BUY_COST} XP to buy a streak shield. You currently have ${currentXp} XP.\n\nYou can watch an ad instead for free!`,
        [
          { text: 'Watch Ad (Free)', onPress: handleClaimAdShield },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsClaimingShield(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deducted = deductXp(XP_SHIELD_BUY_COST);
      if (!deducted) return;

      const newXp = Math.max(0, currentXp - XP_SHIELD_BUY_COST);
      await supabase.from('profiles').update({ xp_points: newXp }).eq('id', user.id);

      const nextCount = Math.min(MAX_STREAK_SHIELDS, shieldsCount + 1);
      setShieldsCount(nextCount);
      await setStreakShieldCount(nextCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Shield Purchased!', `Spent ${XP_SHIELD_BUY_COST} XP. You now have ${nextCount} / ${MAX_STREAK_SHIELDS} shields.`);
    } catch {
      Alert.alert('Error', 'Failed to purchase shield.');
    } finally {
      setIsClaimingShield(false);
    }
  };

  const handleAction = async (target: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onClose();
    setTimeout(() => {
      router.push(target as Href);
    }, 150);
  };

  const isBrokenState = isStreakBroken || canRestoreYesterday;

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
            {/* Header Icon Badge */}
            {isBrokenState ? (
              <View style={[styles.flameBadgeContainer, styles.flameBadgeBroken]}>
                <AlertTriangle size={38} color="#EF4444" />
              </View>
            ) : (
              <View style={styles.flameBadgeContainer}>
                <Flame size={44} color="#E8A020" fill="#E8A020" />
              </View>
            )}

            {/* Title & Subtitle */}
            {isBrokenState ? (
              <>
                <Text style={[styles.streakNumber, { color: '#EF4444' }]}>Streak Broken!</Text>
                <Text style={styles.subtitle}>
                  You missed yesterday! {previousStreak > 0 ? `Revive your ${previousStreak}-day streak` : 'Restore it'} before it completely resets.
                </Text>
              </>
            ) : streakCount > 0 ? (
              <>
                <Text style={styles.streakNumber}>{streakCount} Day Streak!</Text>
                <Text style={styles.subtitle}>
                  {isTodayCompleted
                    ? 'Awesome! You completed today. Streak is protected!'
                    : 'Complete today’s habits or focus session to keep it alive.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.streakNumber}>Start Your Streak!</Text>
                <Text style={styles.subtitle}>
                  Complete any habit, task, or focus session today to light your first flame.
                </Text>
              </>
            )}

            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Trophy size={18} color="#E8A020" />
                <Text style={styles.statVal}>
                  {Math.max(bestStreak, streakCount, previousStreak, 1)} Days
                </Text>
                <Text style={styles.statLabel}>Best Record</Text>
              </View>

              <View style={styles.statBox}>
                <ShieldCheck size={18} color="#00B894" />
                <Text style={styles.statVal}>{shieldsCount} / {MAX_STREAK_SHIELDS}</Text>
                <Text style={styles.statLabel}>Streak Shields</Text>
              </View>
            </View>

            {/* RESTORE OPTIONS (Displayed when streak is broken or yesterday missed) */}
            {isBrokenState ? (
              <View style={styles.restoreSection}>
                <Text style={styles.sectionHeaderTitle}>Choose How to Restore</Text>

                {/* Option 1: Watch Ad (Free) */}
                <TouchableOpacity
                  style={styles.restoreOptionCard}
                  onPress={handleRestoreWithAd}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#EEF2FF' }]}>
                    <PlayCircle size={22} color="#4F46E5" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>Watch Video Ad</Text>
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                    </View>
                    <Text style={styles.optionSubtitle}>Watch 1 short ad to revive your streak</Text>
                  </View>
                  {isRestoring && restoringAction === 'ad' ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                  ) : (
                    <RotateCcw size={16} color="#4F46E5" />
                  )}
                </TouchableOpacity>

                {/* Option 2: Restore with XP */}
                <TouchableOpacity
                  style={styles.restoreOptionCard}
                  onPress={handleRestoreWithXp}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Zap size={22} color="#D97706" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>Restore with {XP_RESTORE_COST} XP</Text>
                      <Text style={styles.xpBalanceText}>({currentXp} XP)</Text>
                    </View>
                    <Text style={styles.optionSubtitle}>Instant recovery using your earned XP</Text>
                  </View>
                  {isRestoring && restoringAction === 'xp' ? (
                    <ActivityIndicator size="small" color="#D97706" />
                  ) : (
                    <RotateCcw size={16} color="#D97706" />
                  )}
                </TouchableOpacity>

                {/* Option 3: Use Shield if available */}
                {shieldsCount > 0 && (
                  <TouchableOpacity
                    style={styles.restoreOptionCard}
                    onPress={handleRestoreWithShield}
                    disabled={isRestoring}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIconContainer, { backgroundColor: '#ECFDF5' }]}>
                      <ShieldCheck size={22} color="#059669" />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>Use 1 Streak Shield</Text>
                        <Text style={styles.shieldsLeftText}>({shieldsCount} left)</Text>
                      </View>
                      <Text style={styles.optionSubtitle}>Absorb missed day with active shield</Text>
                    </View>
                    {isRestoring && restoringAction === 'shield' ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <RotateCcw size={16} color="#059669" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* ACTIVE STREAK: Shield Vault & Refill (Simple & Clean) */
              <View style={styles.shieldVaultCard}>
                <View style={styles.shieldVaultHeader}>
                  <Shield size={18} color="#0284C7" />
                  <Text style={styles.shieldVaultTitle}>
                    Streak Shield Vault ({shieldsCount}/{MAX_STREAK_SHIELDS})
                  </Text>
                </View>
                <Text style={styles.shieldVaultDesc}>
                  Shields protect your streak automatically if you take a rest day.
                </Text>

                {shieldsCount < MAX_STREAK_SHIELDS ? (
                  <View style={styles.shieldButtonsRow}>
                    <TouchableOpacity
                      style={styles.shieldActionBtn}
                      onPress={handleClaimAdShield}
                      disabled={isClaimingShield}
                      activeOpacity={0.8}
                    >
                      <PlayCircle size={14} color="#0284C7" />
                      <Text style={styles.shieldActionBtnText}>
                        {isClaimingShield ? 'Loading...' : '+1 Free (Watch Ad)'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.shieldActionBtn, styles.shieldActionBtnSecondary]}
                      onPress={handleBuyShieldWithXp}
                      disabled={isClaimingShield}
                      activeOpacity={0.8}
                    >
                      <Zap size={14} color="#D97706" />
                      <Text style={[styles.shieldActionBtnText, { color: '#B45309' }]}>
                        +1 ({XP_SHIELD_BUY_COST} XP)
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.vaultFullBadge}>
                    <Check size={14} color="#059669" />
                    <Text style={styles.vaultFullText}>Vault Full • Fully Protected</Text>
                  </View>
                )}
              </View>
            )}

            {/* Primary Action CTA */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleAction('/habits')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {isTodayCompleted ? 'Review Today’s Habits' : 'Log Today’s Habits'}
              </Text>
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
    maxHeight: '88%',
    padding: 22,
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
    paddingBottom: 6,
  },
  flameBadgeContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  flameBadgeBroken: {
    backgroundColor: '#FEE2E2',
  },
  streakNumber: {
    fontFamily: 'InstrumentSerif',
    fontSize: 28,
    color: '#17172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statVal: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  restoreSection: {
    width: '100%',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restoreOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#4F46E5',
  },
  xpBalanceText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#D97706',
  },
  shieldsLeftText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#059669',
  },
  shieldVaultCard: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  shieldVaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  shieldVaultTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  shieldVaultDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 15,
    marginBottom: 8,
  },
  shieldButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shieldActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  shieldActionBtnSecondary: {
    backgroundColor: '#FEF3C7',
  },
  shieldActionBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  vaultFullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  vaultFullText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#15803D',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#5B4FE8',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#64748B',
  },
});
