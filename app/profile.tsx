import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { UserProfile, UserCategory } from '@/types/app.types';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Edit2,
  Check,
  Plus,
  Minus,
  LogOut,
  ChevronRight,
  Shield,
  FileText,
  Download,
  Trash2,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermission,
  scheduleMorningBrief,
  scheduleStreakAlert,
  cancelAllNotifications,
} from '@/lib/notifications';

const CATEGORIES: UserCategory[] = ['student', 'employee', 'creator', 'entrepreneur', 'educator', 'aspirant'];
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';

const PEAK_TIMES: ('morning' | 'afternoon' | 'night')[] = ['morning', 'afternoon', 'night'];
const DURATIONS = [25, 50, 90];

export default function ProfileScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAuthStore();

  // Statistics queries
  const { data: totalFocusMin } = useQuery({
    queryKey: ['profileFocusTime'],
    queryFn: async () => {
      const { data, error } = await supabase.from('focus_sessions').select('duration_min');
      if (error) throw error;
      return (data || []).reduce((sum, fs) => sum + fs.duration_min, 0);
    },
  });

  const { data: goalsCount } = useQuery({
    queryKey: ['profileGoalsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: habitStreak } = useQuery({
    queryKey: ['profileHabitStreak'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('habit_logs')
        .select('date, done')
        .eq('done', true);
      if (error) throw error;

      const doneDates = new Set((logs || []).map((l) => l.date));
      let streak = 0;

      const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
      const checkDate = new Date();
      const checkDateTodayStr = formatDateStr(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
      const checkDateYesterdayStr = formatDateStr(checkDate);

      if (doneDates.has(checkDateTodayStr)) {
        streak = 1;
        const curr = new Date();
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (doneDates.has(dateStr)) {
            streak++;
          } else {
            break;
          }
        }
      } else if (doneDates.has(checkDateYesterdayStr)) {
        streak = 1;
        const curr = new Date();
        curr.setDate(curr.getDate() - 1);
        while (true) {
          curr.setDate(curr.getDate() - 1);
          const dateStr = formatDateStr(curr);
          if (doneDates.has(dateStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
      return streak;
    },
  });

  const totalFocusHours = totalFocusMin ? Math.round(totalFocusMin / 60) : 0;

  // Local Settings States
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [dailyHours, setDailyHours] = useState(profile?.daily_hours || 4);
  const [category, setCategory] = useState<UserCategory>(profile?.category || 'student');
  const [peakTime, setPeakTime] = useState(profile?.peak_time || 'morning');
  const [defaultDuration, setDefaultDuration] = useState(25);

  // Notifications toggles
  const [morningBriefEnabled, setMorningBriefEnabled] = useState(true);
  const [streakAlertsEnabled, setStreakAlertsEnabled] = useState(true);
  const [habitRemindersEnabled, setHabitRemindersEnabled] = useState(true);

  // Initialize notifications state from AsyncStorage
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const mb = await AsyncStorage.getItem('pref_morning_brief');
        const sa = await AsyncStorage.getItem('pref_streak_alerts');
        const hr = await AsyncStorage.getItem('pref_habit_reminders');
        const dur = await AsyncStorage.getItem('pref_default_duration');

        if (mb !== null) setMorningBriefEnabled(mb === 'true');
        if (sa !== null) setStreakAlertsEnabled(sa === 'true');
        if (hr !== null) setHabitRemindersEnabled(hr === 'true');
        if (dur !== null) setDefaultDuration(parseInt(dur, 10));
      } catch (e) {
        // silent
      }
    };
    loadNotificationSettings();
  }, []);

  // Profile update helper
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const handleSaveName = () => {
    if (!name.trim()) return;
    updateProfileMutation.mutate({ name: name.trim() });
    setIsEditingName(false);
  };

  const handleDailyHoursChange = (change: number) => {
    const newHours = Math.max(1, Math.min(24, dailyHours + change));
    setDailyHours(newHours);
    updateProfileMutation.mutate({ daily_hours: newHours });
  };

  const handleCategorySelect = (cat: UserCategory) => {
    setCategory(cat);
    updateProfileMutation.mutate({ category: cat });
  };

  const handlePeakTimeSelect = (pt: 'morning' | 'afternoon' | 'night') => {
    setPeakTime(pt);
    updateProfileMutation.mutate({ peak_time: pt });
  };

  const handleDurationSelect = async (dur: number) => {
    setDefaultDuration(dur);
    await AsyncStorage.setItem('pref_default_duration', String(dur));
  };

  // Toggle handlers for notifications
  const handleToggleMorningBrief = async (value: boolean) => {
    setMorningBriefEnabled(value);
    await AsyncStorage.setItem('pref_morning_brief', String(value));
    if (value) {
      // Find top task if available or schedule general brief
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title')
        .is('completed_at', null)
        .limit(1);
      const topTitle = tasks && tasks[0] ? tasks[0].title : 'Complete your daily habits';
      await scheduleMorningBrief(topTitle);
    } else {
      await Notifications.cancelScheduledNotificationAsync('morning_brief').catch(() => {});
    }
  };

  const handleToggleStreakAlerts = async (value: boolean) => {
    setStreakAlertsEnabled(value);
    await AsyncStorage.setItem('pref_streak_alerts', String(value));
    if (value) {
      await scheduleStreakAlert();
    } else {
      await Notifications.cancelScheduledNotificationAsync('streak_alert').catch(() => {});
    }
  };

  const handleToggleHabitReminders = async (value: boolean) => {
    setHabitRemindersEnabled(value);
    await AsyncStorage.setItem('pref_habit_reminders', String(value));
    // Additional custom logic or scheduling for habit reminders can be added here
  };

  // Export User Data
  const handleExportData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profiles, goals, milestones, tasks, habits, habit_logs, notes, focus_sessions, schedule_blocks, syllabus_topics, study_rooms, daily_checkins] = await Promise.all([
        supabase.from('profiles').select('*').single(),
        supabase.from('goals').select('*'),
        supabase.from('milestones').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('habits').select('*'),
        supabase.from('habit_logs').select('*'),
        supabase.from('notes').select('*'),
        supabase.from('focus_sessions').select('*'),
        supabase.from('schedule_blocks').select('*'),
        supabase.from('syllabus_topics').select('*'),
        supabase.from('study_rooms').select('*'),
        supabase.from('daily_checkins').select('*'),
      ]);

      const allData = {
        exportedAt: new Date().toISOString(),
        profile: profiles.data,
        goals: goals.data || [],
        milestones: milestones.data || [],
        tasks: tasks.data || [],
        habits: habits.data || [],
        habit_logs: habit_logs.data || [],
        notes: notes.data || [],
        focus_sessions: focus_sessions.data || [],
        schedule_blocks: schedule_blocks.data || [],
        syllabus_topics: syllabus_topics.data || [],
        study_rooms: study_rooms.data || [],
        daily_checkins: daily_checkins.data || [],
      };

      await Share.share({
        message: JSON.stringify(allData, null, 2),
        title: 'LifeTrack Pro Exported Data',
      });
    } catch (err) {
      if (__DEV__) console.warn('Export error:', err);
    }
  };

  // Delete User Account
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will erase all your stats, study rooms, goals, habits, and notes forever. Proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Erase Everything',
                  style: 'destructive',
                  onPress: async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                      const { error } = await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', session.user.id);
                      if (error) {
                        Alert.alert('Error deleting account', error.message);
                        return;
                      }
                      await cancelAllNotifications();
                      await supabase.auth.signOut();
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const initials = profile?.name ? profile.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerAvatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerNameRow}>
              {isEditingName ? (
                <View style={styles.inlineEditContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.inlineSaveButton} onPress={handleSaveName}>
                    <Check size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inlineEditContainer}>
                  <Text style={styles.profileName}>{profile?.name}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Edit2 size={14} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{profile?.category}</Text>
            </View>

            <Text style={styles.editPhotoText}>Edit Photo (Future feature)</Text>
          </View>
        </View>

        {/* STATS SUMMARY ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNum}>{totalFocusHours}</Text>
            <Text style={styles.statsLabel}>Focus Hours</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsNum}>{goalsCount}</Text>
            <Text style={styles.statsLabel}>Goals Created</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsNum}>{habitStreak || 0}</Text>
            <Text style={styles.statsLabel}>Habit Streak</Text>
          </View>
        </View>

        {/* SETTINGS SECTIONS */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          {/* Stepper Daily hours */}
          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Daily hours goal</Text>
              <Text style={styles.rowSubtitle}>Target focus hours per day</Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleDailyHoursChange(-1)}
              >
                <Minus size={16} color="#5C5C70" />
              </TouchableOpacity>
              <Text style={styles.stepperVal}>{dailyHours}h</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleDailyHoursChange(1)}
              >
                <Plus size={16} color="#5C5C70" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Selector Chips */}
          <View style={styles.rowBlock}>
            <Text style={styles.rowBlockTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => handleCategorySelect(cat)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Morning Brief</Text>
              <Text style={styles.rowSubtitle}>Daily summary at 8:00 AM</Text>
            </View>
            <Switch value={morningBriefEnabled} onValueChange={handleToggleMorningBrief} />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Streak Alerts</Text>
              <Text style={styles.rowSubtitle}>Evening nudge at 9:00 PM</Text>
            </View>
            <Switch value={streakAlertsEnabled} onValueChange={handleToggleStreakAlerts} />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Habit Reminders</Text>
              <Text style={styles.rowSubtitle}>Hourly nudges for active habits</Text>
            </View>
            <Switch value={habitRemindersEnabled} onValueChange={handleToggleHabitReminders} />
          </View>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Peak time */}
          <View style={styles.rowBlock}>
            <Text style={styles.rowBlockTitle}>Peak Study Time</Text>
            <View style={styles.chipGrid}>
              {PEAK_TIMES.map((pt) => {
                const active = peakTime === pt;
                return (
                  <TouchableOpacity
                    key={pt}
                    style={[styles.chip, active && styles.chipActive, { flex: 1, alignItems: 'center' }]}
                    onPress={() => handlePeakTimeSelect(pt)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{pt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Default Duration */}
          <View style={styles.rowBlock}>
            <Text style={styles.rowBlockTitle}>Default Focus Duration</Text>
            <View style={styles.chipGrid}>
              {DURATIONS.map((dur) => {
                const active = defaultDuration === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.chip, active && styles.chipActive, { flex: 1, alignItems: 'center' }]}
                    onPress={() => handleDurationSelect(dur)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{dur} min</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* DATA SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Data</Text>

          <TouchableOpacity style={styles.row} onPress={handleExportData} activeOpacity={0.7}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Export my data</Text>
              <Text style={styles.rowSubtitle}>Download all metrics in JSON format</Text>
            </View>
            <Download size={18} color="#9B9BAF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.rowLabelCol}>
              <Text style={[styles.rowTitle, { color: '#E85858' }]}>Delete account</Text>
              <Text style={styles.rowSubtitle}>Irreversibly delete account and data</Text>
            </View>
            <Trash2 size={18} color="#E85858" />
          </TouchableOpacity>
        </View>

        {/* APP SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>App</Text>

          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Version</Text>
            </View>
            <Text style={styles.rowVal}>1.0.0</Text>
          </View>

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://lifetrackpro.app/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
            </View>
            <Shield size={18} color="#9B9BAF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://lifetrackpro.app/terms')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Terms of Service</Text>
            </View>
            <FileText size={18} color="#9B9BAF" />
          </TouchableOpacity>
        </View>

        {/* SIGN OUT BUTTON */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <LogOut size={16} color="#E85858" style={{ marginRight: 8 }} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#17172A',
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerAvatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileName: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#FFFFFF',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  inlineEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    justifyContent: 'center',
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontFamily: 'DMSans',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  inlineSaveButton: {
    backgroundColor: '#5B4FE8',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: '#EAE8FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  categoryPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    color: '#5B4FE8',
    textTransform: 'capitalize',
  },
  editPhotoText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: -20,
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statsNum: {
    fontFamily: 'DMMono',
    fontSize: 20,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 4,
  },
  statsLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    marginHorizontal: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#9B9BAF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F4F3F0',
  },
  rowLabelCol: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  rowSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: 2,
  },
  rowVal: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5C5C70',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 8,
    padding: 4,
    gap: 12,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    fontFamily: 'DMMono',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  rowBlock: {
    paddingVertical: 12,
  },
  rowBlockTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 10,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E8E7E3',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipActive: {
    borderColor: '#5B4FE8',
    backgroundColor: '#EAE8FD',
  },
  chipText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5C5C70',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E85858',
    borderRadius: 12,
    marginHorizontal: 20,
    height: 48,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  signOutButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#E85858',
  },
});
