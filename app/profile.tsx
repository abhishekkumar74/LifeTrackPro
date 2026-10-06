import { RatingModal } from '@/components/shared/RatingModal';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { useNotificationPermission } from '@/lib/hooks/use-permissions';
import {
  cancelAllNotifications,
  cancelScheduledNotification,
  scheduleMorningBrief,
  scheduleStreakAlert,
} from '@/lib/notifications';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUiStore } from '@/lib/store/ui.store';
import { supabase } from '@/lib/supabase/client';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import { UserCategory, UserProfile } from '@/types/app.types';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  MessageSquare,
  Minus,
  Plus,
  Shield,
  Star,
  Upload,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES: UserCategory[] = ['student', 'cse_student', 'employee', 'creator', 'entrepreneur', 'educator', 'aspirant'];
const PEAK_TIMES: ('morning' | 'afternoon' | 'night')[] = ['morning', 'afternoon', 'night'];
const DURATIONS = [25, 50, 90];

const SUBCATEGORIES: Record<UserCategory, string[]> = {
  cse_student: [
    'Amazon SDE',
    'Google SWE',
    'Microsoft SWE',
    'Meta/Facebook',
    'Startup (Product)',
    'FAANG (General)',
    'GATE Exam',
    'Campus Placement',
    'Higher Studies (MS/MBA)',
    'Backend Development',
    'Full Stack Development',
    'DevOps / Cloud',
    'System Design',
    'Competitive Programming',
    'Open Source',
    'Other',
  ],
  student: [
    'NEET',
    'JEE Main',
    'JEE Advanced',
    'UPSC CSE',
    'UPSC CAPF',
    'SSC CGL',
    'SSC CHSL',
    'SSC MTS',
    'IBPS PO',
    'IBPS Clerk',
    'SBI PO',
    'RBI Grade B',
    'SEBI',
    'CAT',
    'XAT',
    'GMAT',
    'GRE',
    'GATE',
    'ESE/IES',
    'CLAT',
    'AILET',
    'LSAT',
    'NDA',
    'CDS',
    'AFCAT',
    'CUET',
    'Class 10 Boards',
    'Class 12 Boards',
    'CA Foundation',
    'CA Intermediate',
    'CA Final',
    'CS Foundation',
    'CMA',
    'IELTS',
    'TOEFL',
    'PTE',
    'Coding / DSA',
    'Other',
  ],
  employee: [
    'Corporate / MNC',
    'Government Job',
    'PSU / Public Sector',
    'Banking & Finance',
    'IT / Software',
    'Healthcare / Medical',
    'Teaching / Education',
    'Legal / Law',
    'Defence / Military',
    'Police / CRPF / BSF',
    'Railways',
    'Remote / Work from Home',
    'Startup / Scaleup',
    'Self Employed',
    'Other',
  ],
  creator: [
    'YouTuber / Video Creator',
    'Instagram / Reels Creator',
    'Blogger / Writer',
    'Podcaster',
    'Graphic Designer',
    'UI/UX Designer',
    'Photographer / Videographer',
    'Music Artist',
    'Developer / Programmer',
    'Freelancer',
    'Digital Marketer',
    'Other',
  ],
  entrepreneur: [
    'Early Stage Startup',
    'Growing Business',
    'E-commerce / D2C',
    'SaaS / Tech Product',
    'Service Business',
    'Manufacturing',
    'Agriculture / AgriTech',
    'EdTech',
    'FinTech',
    'HealthTech',
    'Real Estate',
    'Side Business / Hustle',
    'Other',
  ],
  educator: [
    'School Teacher',
    'College Professor',
    'Online Tutor / Coach',
    'Coaching Institute',
    'Corporate Trainer',
    'Skill Trainer',
    'Other',
  ],
  aspirant: [
    'Career Change',
    'Skill Building',
    'Physical Fitness',
    'Language Learning',
    'Music / Arts',
    'Personal Development',
    'Financial Goals',
    'Health & Wellness',
    'Other',
  ],
};

export default function ProfileScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAuthStore();
  const showToast = useUiStore((state) => state.showToast);
  const { request: requestNotificationPermission } = useNotificationPermission();

  // Tab scroll registration
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    tabScrollRefs['profile'] = scrollRef;
    return () => {
      delete tabScrollRefs['profile'];
    };
  }, []);

  // Statistics queries
  const { data: totalFocusMin, isLoading: focusLoading } = useQuery({
    queryKey: ['profileFocusTime'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_min')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return (data || []).reduce((sum, fs) => sum + fs.duration_min, 0);
    },
  });

  const { data: goalsCount, isLoading: goalsLoading } = useQuery({
    queryKey: ['profileGoalsCount'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { count, error } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: habitStreak, isLoading: streakLoading } = useQuery({
    queryKey: ['profileHabitStreak'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: logs, error } = await supabase
        .from('habit_logs')
        .select('date, done')
        .eq('user_id', session.user.id)
        .eq('done', true);
      if (error) throw error;

      const doneDates = new Set((logs || []).map((l) => l.date));
      let streak = 0;

      const formatDateStr = (d: Date) => d.toLocaleDateString('en-CA');
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

  const focusHoursVal = (totalFocusMin && totalFocusMin > 0)
    ? (() => {
      const val = (totalFocusMin / 60.0).toFixed(1);
      return val === '0.0' ? '—' : val;
    })()
    : '—';

  const goalsCountVal = (goalsCount && goalsCount > 0) ? String(goalsCount) : '—';
  const habitStreakVal = (habitStreak && habitStreak > 0) ? String(habitStreak) : '—';

  // Local Settings States
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [dailyHours, setDailyHours] = useState(profile?.daily_hours || 4);
  const [category, setCategory] = useState<UserCategory>(profile?.category || 'student');
  const [peakTime, setPeakTime] = useState(profile?.peak_time || 'morning');
  const [defaultDuration, setDefaultDuration] = useState(25);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Subcategory and bottom sheet states
  const subCategorySheetRef = useRef<BottomSheet>(null);
  const [isSubCategoryPickerOpen, setIsSubCategoryPickerOpen] = useState(false);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(profile?.sub_category || []);
  const [customSubcategoryText, setCustomSubcategoryText] = useState('');
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState('');

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

  // Sync state if profile loads asynchronously
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDailyHours(profile.daily_hours || 4);
      setCategory(profile.category || 'student');
      setPeakTime(profile.peak_time || 'morning');

      const subCats = profile.sub_category || [];
      setSelectedSubcategories(subCats);

      // Extract custom subcategory if any
      const predefined = SUBCATEGORIES[profile.category || 'student'] || [];
      const custom = subCats.find((s) => !predefined.includes(s));
      setCustomSubcategoryText(custom || '');
    }
  }, [profile]);

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
    updateProfileMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          showToast('Saved ✓', 'success');
          setIsEditingName(false);
        },
        onError: () => {
          showToast('Failed to update name', 'error');
        },
      }
    );
  };

  const handleDailyHoursChange = (change: number) => {
    const newHours = Math.max(1, Math.min(24, dailyHours + change));
    setDailyHours(newHours);
    updateProfileMutation.mutate({ daily_hours: newHours });
  };

  const handleOpenSubCategoryPicker = () => {
    setSelectedSubcategories(profile?.sub_category || []);
    const predefined = SUBCATEGORIES[category] || [];
    const custom = (profile?.sub_category || []).find((s) => !predefined.includes(s));
    setCustomSubcategoryText(custom || '');
    setSubCategorySearchQuery('');
    setIsSubCategoryPickerOpen(true);
  };

  const handleCategorySelect = (cat: UserCategory) => {
    setCategory(cat);
    setSelectedSubcategories([]);
    setCustomSubcategoryText('');
    setSubCategorySearchQuery('');

    updateProfileMutation.mutate(
      { category: cat, sub_category: [] },
      {
        onSuccess: () => {
          setTimeout(() => {
            handleOpenSubCategoryPicker();
          }, 300);
        },
      }
    );
  };

  const handleToggleSubcategory = (sub: string) => {
    const isMultiSelect = category === 'student' || category === 'cse_student';
    if (isMultiSelect) {
      if (selectedSubcategories.includes(sub)) {
        setSelectedSubcategories(selectedSubcategories.filter((x) => x !== sub));
      } else {
        setSelectedSubcategories([...selectedSubcategories, sub]);
      }
    } else {
      if (selectedSubcategories.includes(sub)) {
        setSelectedSubcategories([]);
      } else {
        setSelectedSubcategories([sub]);
      }
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleSaveSubcategories = () => {
    const hasOther = selectedSubcategories.includes('Other');
    let finalSubcategories = [...selectedSubcategories];

    if (hasOther && customSubcategoryText.trim()) {
      const predefined = SUBCATEGORIES[category] || [];
      finalSubcategories = selectedSubcategories.filter(
        (s) => predefined.includes(s) || s === 'Other'
      );
      finalSubcategories.push(customSubcategoryText.trim());
    }

    updateProfileMutation.mutate(
      { sub_category: finalSubcategories },
      {
        onSuccess: () => {
          showToast('Updated ✓', 'success');
          setIsSubCategoryPickerOpen(false);
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
        onError: () => {
          showToast('Failed to update sub-category', 'error');
        },
      }
    );
  };

  const filteredSubCategories = useMemo(() => {
    const predefined = SUBCATEGORIES[category] || [];
    const query = subCategorySearchQuery.trim().toLowerCase();
    if (!query) return predefined;
    return predefined.filter((sub) => sub.toLowerCase().includes(query));
  }, [category, subCategorySearchQuery]);

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
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setMorningBriefEnabled(false);
        return;
      }
    }
    setMorningBriefEnabled(value);
    await AsyncStorage.setItem('pref_morning_brief', String(value));
    if (value) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title')
        .is('completed_at', null)
        .limit(1);
      const topTitle = tasks && tasks[0] ? tasks[0].title : 'Complete your daily habits';
      await scheduleMorningBrief(topTitle);
    } else {
      await cancelScheduledNotification('morning_brief');
    }
  };

  const handleToggleStreakAlerts = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setStreakAlertsEnabled(false);
        return;
      }
    }
    setStreakAlertsEnabled(value);
    await AsyncStorage.setItem('pref_streak_alerts', String(value));
    if (value) {
      await scheduleStreakAlert();
    } else {
      await cancelScheduledNotification('streak_alert');
    }
  };

  const handleToggleHabitReminders = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setHabitRemindersEnabled(false);
        return;
      }
    }
    setHabitRemindersEnabled(value);
    await AsyncStorage.setItem('pref_habit_reminders', String(value));
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
          await useAuthStore.getState().signOut();
        },
      },
    ]);
  };

  const getCategoryDisplay = () => {
    const cat = profile?.category ? profile.category.charAt(0).toUpperCase() + profile.category.slice(1) : 'Student';
    const subCats = profile?.sub_category && profile.sub_category.length > 0
      ? profile.sub_category.join(', ')
      : '';
    return subCats ? `${cat} · ${subCats}` : cat;
  };

  const initials = profile?.name ? profile.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#17172A" translucent={false} />
      
      {/* FIXED TOP NAV BAR (Ensures status bar area is always dark navy with white icons) */}
      <View style={[styles.fixedTopNav, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <TouchableOpacity
          style={styles.fixedBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.fixedTopTitle}>Profile & Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* HEADER AVATAR BANNER */}
          <View style={styles.header}>
            <View style={styles.headerAvatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.headerNameRow}>
              <Text style={styles.profileName}>{profile?.name || 'Achiever'}{profile?.is_premium ? ' ✨' : ''}</Text>
            </View>

            <TouchableOpacity
              style={styles.categoryPill}
              onPress={handleOpenSubCategoryPicker}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryPillText}>{getCategoryDisplay()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STATS SUMMARY ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            {focusLoading ? (
              <View style={styles.skeletonBlock} />
            ) : (
              <Text style={styles.statsNum}>{focusHoursVal}</Text>
            )}
            <Text style={styles.statsLabel}>Focus Hours</Text>
          </View>

          <View style={styles.statsCard}>
            {goalsLoading ? (
              <View style={styles.skeletonBlock} />
            ) : (
              <Text style={styles.statsNum}>{goalsCountVal}</Text>
            )}
            <Text style={styles.statsLabel}>Goals Created</Text>
          </View>

          <View style={styles.statsCard}>
            {streakLoading ? (
              <View style={styles.skeletonBlock} />
            ) : (
              <Text style={styles.statsNum}>{habitStreakVal}</Text>
            )}
            <Text style={styles.statsLabel}>Habit Streak</Text>
          </View>
        </View>

        {/* SETTINGS SECTIONS */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          {/* LifeTrack Gold Subscription Row */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>LifeTrack Gold</Text>
              <Text style={styles.rowSubtitle}>
                {profile?.is_premium
                  ? 'Your subscription is active'
                  : 'Unlock exclusive themes, soundscapes & charts'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {profile?.is_premium ? (
                <View style={styles.premiumBadgeActive}>
                  <Text style={styles.premiumBadgeActiveText}>ACTIVE</Text>
                </View>
              ) : (
                <View style={styles.premiumBadgeUpgrade}>
                  <Text style={styles.premiumBadgeUpgradeText}>UPGRADE</Text>
                </View>
              )}
              <ChevronRight size={16} color="#9B9BAF" />
            </View>
          </TouchableOpacity>

          {/* Inline Edit Name Row */}
          {isEditingName ? (
            <View style={styles.rowEditing}>
              <Text style={styles.rowTitle}>Name</Text>
              <View style={styles.inputWithButtonRow}>
                <TextInput
                  style={styles.nameRowInput}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  onBlur={() => {
                    setTimeout(() => {
                      setIsEditingName(false);
                    }, 200);
                  }}
                />
                <TouchableOpacity style={styles.inlineSaveButton} onPress={handleSaveName}>
                  <Check size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setName(profile?.name || '');
                setIsEditingName(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowLabelCol}>
                <Text style={styles.rowTitle}>Name</Text>
                <Text style={styles.rowSubtitle}>Tap to edit your profile name</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.rowVal}>{profile?.name || 'Achiever'}</Text>
                <ChevronRight size={16} color="#9B9BAF" />
              </View>
            </TouchableOpacity>
          )}

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

          {/* Sub-category / Preparation row */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleOpenSubCategoryPicker}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>
                {(category === 'student' || category === 'cse_student') ? 'Preparation / Exams' : 'Sub-category'}
              </Text>
              <Text style={styles.rowSubtitle}>
                {(category === 'student' || category === 'cse_student')
                  ? 'Exams or subjects you are preparing for'
                  : 'Your specific focus area'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                style={[styles.rowVal, { maxWidth: 150 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {profile?.sub_category && profile.sub_category.length > 0
                  ? profile.sub_category.join(', ')
                  : 'None selected'}
              </Text>
              <ChevronRight size={16} color="#9B9BAF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* PERSONAL VAULT & DIARY SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Personal Vault & Reflections</Text>

          <TouchableOpacity
            style={styles.journalVaultCard}
            onPress={() => router.push('/journal' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.journalVaultIconCol}>
              <Lock size={18} color="#E5A93C" />
            </View>
            <View style={styles.journalVaultTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.journalVaultTitle}>Secret Journal Vault</Text>
                <View style={styles.journalVaultBadge}>
                  <Text style={styles.journalVaultBadgeText}>PIN VAULT</Text>
                </View>
              </View>
              <Text style={styles.journalVaultSub} numberOfLines={1}>
                Private daily reflections & growth logs
              </Text>
            </View>
            <ChevronRight size={16} color="#E5A93C" />
          </TouchableOpacity>
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

          {/* Manage Routines */}
          <TouchableOpacity
            style={[styles.row, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F2F1EE', paddingTop: 12 }]}
            onPress={() => router.push('/routines')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Manage Routines</Text>
              <Text style={styles.rowSubtitle}>Edit or delete recurring daily schedules</Text>
            </View>
            <ChevronRight size={16} color="#9B9BAF" />
          </TouchableOpacity>
        </View>

        {/* DATA & PRIVACY SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <TouchableOpacity style={styles.row} onPress={handleExportData} activeOpacity={0.7}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Request Data Export</Text>
              <Text style={styles.rowSubtitle}>Get a copy of all your data</Text>
            </View>
            <Upload size={18} color="#9B9BAF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('mailto:support@lifetrackpro.com')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Contact Support</Text>
              <Text style={styles.rowSubtitle}>Report an issue or get help</Text>
            </View>
            <MessageSquare size={18} color="#9B9BAF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>View how we protect your information</Text>
            </View>
            <Shield size={18} color="#9B9BAF" />
          </TouchableOpacity>
        </View>

        {/* APP SECTION */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>App</Text>

          <View style={styles.row}>
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Version</Text>
            </View>
            <Text style={styles.rowVal}>1.0.1</Text>
          </View>

          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowRatingModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Rate LifeTrack Pro</Text>
              <Text style={styles.rowSubtitle}>Enjoying the app? Leave us a rating</Text>
            </View>
            <Star size={18} color="#E8A020" fill="#E8A020" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/terms')}
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

      {/* Subcategory Picker Bottom Sheet */}
      {isSubCategoryPickerOpen && (
        <BottomSheet
          ref={subCategorySheetRef}
          index={0}
          snapPoints={['75%']}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          keyboardBehavior="interactive"
          onChange={(index) => {
            if (index === -1) {
              setIsSubCategoryPickerOpen(false);
            }
          }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {(category === 'student' || category === 'cse_student') ? 'Select Preparations / Exams' : 'Select Sub-category'}
              </Text>
              <TouchableOpacity
                style={styles.sheetSaveButton}
                onPress={handleSaveSubcategories}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sheetSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Search bar for student */}
            {(category === 'student' || category === 'cse_student') && (
              <View style={styles.sheetSearchContainer}>
                <TextInput
                  style={styles.sheetSearchInput}
                  placeholder="Search exams/subjects..."
                  placeholderTextColor="#9B9BAF"
                  value={subCategorySearchQuery}
                  onChangeText={setSubCategorySearchQuery}
                  autoCorrect={false}
                />
              </View>
            )}

            <ScrollView
              style={styles.sheetScrollView}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sheetPillsContainer}>
                {filteredSubCategories.map((sub) => {
                  const isSelected = selectedSubcategories.includes(sub);
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[
                        styles.sheetPill,
                        isSelected ? styles.sheetPillSelected : styles.sheetPillUnselected,
                      ]}
                      onPress={() => handleToggleSubcategory(sub)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sheetPillText,
                          isSelected ? styles.sheetPillTextSelected : styles.sheetPillTextUnselected,
                        ]}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Input for Other */}
              {selectedSubcategories.includes('Other') && (
                <View style={styles.sheetCustomInputContainer}>
                  <Text style={styles.sheetCustomLabel}>Enter your custom focus area:</Text>
                  <BottomSheetTextInput
                    style={styles.sheetCustomInput}
                    placeholder="e.g. CA Foundation, IELTS, Coding..."
                    placeholderTextColor="#9B9BAF"
                    value={customSubcategoryText}
                    onChangeText={setCustomSubcategoryText}
                    maxLength={50}
                    autoCorrect={false}
                  />
                </View>
              )}
            </ScrollView>
          </BottomSheetView>
        </BottomSheet>
      )}

      {/* Rating Reminder Modal */}
      <RatingModal
        isVisible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />
    </SafeAreaView>
  </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#17172A',
  },
  fixedTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#17172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 100,
  },
  fixedBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedTopTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#17172A',
    paddingTop: 16,
    paddingBottom: 28,
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    justifyContent: 'center',
    height: 80,
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
  skeletonBlock: {
    width: 45,
    height: 24,
    backgroundColor: '#EAEAEF',
    borderRadius: 4,
    marginBottom: 4,
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
  rowEditing: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F4F3F0',
  },
  inputWithButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  nameRowInput: {
    flex: 1,
    backgroundColor: '#F7F6F3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 12,
    height: 40,
    color: '#17172A',
    fontFamily: 'DMSans',
    fontSize: 14,
  },
  inlineSaveButton: {
    backgroundColor: '#5B4FE8',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#17172A',
    flex: 1,
    marginRight: 12,
  },
  sheetSaveButton: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetSaveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  sheetSearchInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    padding: 0,
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingBottom: 20,
  },
  sheetPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E7E3',
  },
  sheetPillSelected: {
    backgroundColor: '#EAE8FD',
    borderColor: '#5B4FE8',
  },
  sheetPillText: {
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  sheetPillTextUnselected: {
    color: '#5C5C70',
    fontWeight: '400',
  },
  sheetPillTextSelected: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  sheetCustomInputContainer: {
    marginTop: 20,
  },
  sheetCustomLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#5C5C70',
    marginBottom: 8,
  },
  sheetCustomInput: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  premiumBadgeActive: {
    backgroundColor: 'rgba(232, 160, 32, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 32, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumBadgeActiveText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#E8A020',
  },
  premiumBadgeUpgrade: {
    backgroundColor: '#5B4FE8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumBadgeUpgradeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  journalVaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1A29',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.25)',
    gap: 12,
  },
  journalVaultIconCol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#241F32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.3)',
  },
  journalVaultTextCol: {
    flex: 1,
  },
  journalVaultTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F4EFEB',
  },
  journalVaultBadge: {
    backgroundColor: 'rgba(229, 169, 60, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.3)',
  },
  journalVaultBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#E5A93C',
    letterSpacing: 0.5,
  },
  journalVaultSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#A8A2B5',
    marginTop: 2,
  },
});
