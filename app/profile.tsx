import { RatingModal } from '@/components/shared/RatingModal';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { useNotificationPermission } from '@/lib/hooks/use-permissions';
import {
  cancelAllNotifications,
  cancelScheduledNotification,
  scheduleMorningBrief,
  scheduleStreakAlert,
  scheduleHabitReminder,
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
import { router, Href } from 'expo-router';
import { CONFIG } from '@/constants/config';
import { resetUser } from '@/lib/posthog';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Crown,
  FileText,
  Info,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
const DELETION_REASONS = [
  'Too busy / Need to focus offline',
  'Trouble getting started or not useful',
  'Privacy or data security concerns',
  'Created a second or fresh account',
  'Too many reminders or notifications',
  'Something else',
];

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
  const { profile, setProfile, user } = useAuthStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalView, setAccountModalView] = useState<'main' | 'change_password' | 'ownership' | 'deletion_wizard'>('main');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionPassword, setDeletionPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isOAuthUser = useMemo(() => {
    const provider = user?.app_metadata?.provider;
    return Boolean(provider && provider !== 'email');
  }, [user]);

  const scheduledPurgeDate = useMemo(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setAccountModalView('main');
    setNewPassword('');
    setConfirmPassword('');
    setDeletionPassword('');
    setDeletionReason('');
  };

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

      const dbUpdates = { ...updates };
      if ((dbUpdates.category as string) === 'cse_student') {
        dbUpdates.category = 'student' as any;
        if (!dbUpdates.sub_category?.includes('cse_student')) {
          dbUpdates.sub_category = ['cse_student', ...(dbUpdates.sub_category || [])];
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      const userProf = { ...data } as UserProfile;
      if ((userProf.category as string) === 'student' && userProf.sub_category?.includes('cse_student')) {
        userProf.category = 'cse_student';
      }
      setProfile(userProf);
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
    if (value) {
      await scheduleHabitReminder(14, 30);
    } else {
      await cancelScheduledNotification('afternoon_habit');
    }
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

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }
    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setAccountModalView('main');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Deactivate Account?',
      'Taking a break? Your profile and streaks will be temporarily hidden. You can reactivate your account at any time simply by logging back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              closeAccountModal();
              await cancelAllNotifications();
              resetUser();
              queryClient.clear();
              await supabase.auth.signOut();
              useAuthStore.getState().clearAuth();
              router.replace('/login');
              Alert.alert('Account Deactivated', 'Your account is now taking a break. Log back in anytime to reactivate.');
            } catch (err: any) {
              if (__DEV__) console.warn('Error deactivating account:', err);
            }
          },
        },
      ]
    );
  };

  const handleScheduleDeletion = async () => {
    if (!deletionReason) {
      Alert.alert('Reason Required', 'Please select a reason why you are leaving.');
      return;
    }

    if (!isOAuthUser) {
      if (!deletionPassword.trim()) {
        Alert.alert('Password Required', 'Please enter your password to confirm identity.');
        return;
      }
      setIsVerifyingPassword(true);
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: deletionPassword,
      });
      setIsVerifyingPassword(false);

      if (authErr) {
        Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please check and try again.');
        return;
      }
    } else {
      if (deletionPassword.trim().toUpperCase() !== 'DELETE') {
        Alert.alert('Confirmation Required', 'Please type DELETE in capital letters to confirm.');
        return;
      }
    }

    try {
      setIsDeletingAccount(true);
      const currentUserId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id;

      if (currentUserId) {
        // 1. Try RPC schedule_account_deletion
        const { error: rpcError } = await supabase.rpc('schedule_account_deletion');

        // 2. Fallback to direct update on profiles table if RPC is not created yet
        if (rpcError) {
          if (__DEV__) console.warn('schedule_account_deletion RPC fallback:', rpcError.message);
          await supabase
            .from('profiles')
            .update({
              is_pending_deletion: true,
              deletion_scheduled_at: new Date().toISOString(),
            })
            .eq('id', currentUserId);
        }
      }

      // Close modal & reset fields
      closeAccountModal();

      // Cancel notifications and reset analytics
      await cancelAllNotifications();
      resetUser();

      // Clear local storage & sign out
      await AsyncStorage.clear();
      queryClient.clear();
      await supabase.auth.signOut();
      useAuthStore.getState().clearAuth();

      // Route to login and notify user
      router.replace('/login');
      Alert.alert(
        'Account Deactivated',
        `Your account has been deactivated and scheduled for permanent deletion on ${scheduledPurgeDate}. You can log back in anytime before this date to cancel.`
      );
    } catch (err: any) {
      if (__DEV__) console.error('Error scheduling account deletion:', err);
      Alert.alert(
        'Action Failed',
        'Could not schedule account deletion. Please check your internet connection or contact support@lifetrackpro.com.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
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
            onPress={() => {
              if (profile?.is_premium) {
                router.push('/journal' as any);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                Alert.alert(
                  'Secret Journal Vault 👑',
                  'The Secret Journal Vault is an exclusive Gold Member feature. Upgrade to LifeTrack Pro Gold to unlock your private encrypted diary, PIN security, and custom handwriting fonts.',
                  [
                    {
                      text: 'Upgrade to Gold 👑',
                      onPress: () => router.push('/paywall'),
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.journalVaultIconCol}>
              {profile?.is_premium ? (
                <Lock size={18} color="#E5A93C" />
              ) : (
                <Crown size={18} color="#D97706" />
              )}
            </View>
            <View style={styles.journalVaultTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.journalVaultTitle}>Secret Journal Vault</Text>
                <View style={profile?.is_premium ? styles.journalVaultBadge : styles.journalVaultGoldBadge}>
                  <Text style={profile?.is_premium ? styles.journalVaultBadgeText : styles.journalVaultGoldBadgeText}>
                    {profile?.is_premium ? 'PIN VAULT' : 'GOLD 👑'}
                  </Text>
                </View>
              </View>
              <Text style={styles.journalVaultSub} numberOfLines={1}>
                {profile?.is_premium
                  ? 'Private daily reflections & growth logs'
                  : 'Exclusive private encrypted diary for Gold members'}
              </Text>
            </View>
            <ChevronRight size={16} color={profile?.is_premium ? '#E5A93C' : '#D97706'} />
          </TouchableOpacity>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <View style={styles.settingsSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <TouchableOpacity
              onPress={() => router.push('/notifications' as Href)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: '#5B4FE8' }}>Notification Center</Text>
              <ChevronRight size={14} color="#5B4FE8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F0EFFB',
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#EAE8FD',
            }}
            onPress={() => router.push('/notifications' as Href)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5B4FE8', justifyContent: 'center', alignItems: 'center' }}>
                <Bell size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#17172A' }}>Notification Hub & Activity</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: '#6B7280' }}>Manage history, test alerts & channels</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#5B4FE8" />
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.row}
            onPress={() => setIsAccountModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabelCol}>
              <Text style={styles.rowTitle}>Account Settings</Text>
              <Text style={styles.rowSubtitle}>Security, email & recovery options</Text>
            </View>
            <ChevronRight size={18} color="#9B9BAF" />
          </TouchableOpacity>

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
            <Text style={styles.rowVal}>{CONFIG.app.version}</Text>
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
          enableDynamicSizing={false}
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

      {/* Hidden Account Settings Modal (Instagram / Spotify style) */}
      <Modal
        visible={isAccountModalOpen}
        animationType="fade"
        transparent
        onRequestClose={closeAccountModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountModalCard}>
            {/* Header */}
            <View style={styles.accountModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {accountModalView !== 'main' && (
                  <TouchableOpacity
                    onPress={() => {
                      if (accountModalView === 'deletion_wizard') setAccountModalView('ownership');
                      else setAccountModalView('main');
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.accountModalBackBtn}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={18} color="#17172A" />
                  </TouchableOpacity>
                )}
                <Text style={styles.accountModalTitle}>
                  {accountModalView === 'main' && 'Account Settings'}
                  {accountModalView === 'change_password' && 'Change Password'}
                  {accountModalView === 'ownership' && 'Ownership & Control'}
                  {accountModalView === 'deletion_wizard' && 'Delete Account'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeAccountModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.accountModalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#717182" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* ================= VIEW 1: MAIN ACCOUNT SETTINGS ================= */}
              {accountModalView === 'main' && (
                <>
                  {/* Section 1: Personal Details */}
                  <Text style={styles.accountSectionLabel}>PERSONAL DETAILS</Text>
                  <View style={styles.accountInfoBox}>
                    <View style={styles.accountInfoRow}>
                      <Text style={styles.accountInfoLabel}>Email</Text>
                      <Text style={styles.accountInfoVal} numberOfLines={1}>
                        {user?.email || profile?.name || 'Authenticated User'}
                      </Text>
                    </View>
                    <View style={styles.accountInfoRow}>
                      <Text style={styles.accountInfoLabel}>Member Since</Text>
                      <Text style={styles.accountInfoVal}>
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          : 'Active Member'}
                      </Text>
                    </View>
                    <View style={styles.accountInfoRow}>
                      <Text style={styles.accountInfoLabel}>Subscription</Text>
                      <Text style={styles.accountInfoVal}>
                        {profile?.is_premium ? 'LifeTrack Pro Premium' : 'Free Tier'}
                      </Text>
                    </View>
                    <View style={[styles.accountInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <Text style={styles.accountInfoLabel}>Status</Text>
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    </View>
                  </View>

                  {/* Section 2: Security & Login */}
                  <Text style={styles.accountSectionLabel}>SECURITY & LOGIN</Text>
                  <View style={styles.accountMenuBox}>
                    {!isOAuthUser && (
                      <TouchableOpacity
                        style={styles.accountMenuRow}
                        onPress={() => setAccountModalView('change_password')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accountMenuIconCircle}>
                          <KeyRound size={16} color="#5B4FE8" />
                        </View>
                        <View style={styles.accountMenuTextCol}>
                          <Text style={styles.accountMenuTitle}>Change Password</Text>
                          <Text style={styles.accountMenuSub}>Update your login password</Text>
                        </View>
                        <ChevronRight size={16} color="#9B9BAF" />
                      </TouchableOpacity>
                    )}
                    <View style={[styles.accountMenuRow, { borderBottomWidth: 0 }]}>
                      <View style={styles.accountMenuIconCircle}>
                        <ShieldCheck size={16} color="#1EAA6B" />
                      </View>
                      <View style={styles.accountMenuTextCol}>
                        <Text style={styles.accountMenuTitle}>Login Security</Text>
                        <Text style={styles.accountMenuSub}>Protected on this active device</Text>
                      </View>
                      <Check size={16} color="#1EAA6B" />
                    </View>
                  </View>

                  {/* Section 3: Account Ownership & Control (Where Deletion is deeply nested!) */}
                  <Text style={styles.accountSectionLabel}>ACCOUNT CONTROL</Text>
                  <View style={styles.accountMenuBox}>
                    <TouchableOpacity
                      style={[styles.accountMenuRow, { borderBottomWidth: 0 }]}
                      onPress={() => setAccountModalView('ownership')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accountMenuIconCircle}>
                        <Lock size={16} color="#717182" />
                      </View>
                      <View style={styles.accountMenuTextCol}>
                        <Text style={styles.accountMenuTitle}>Account Ownership & Control</Text>
                        <Text style={styles.accountMenuSub}>Deactivation or deletion options</Text>
                      </View>
                      <ChevronRight size={16} color="#9B9BAF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ================= VIEW 2: CHANGE PASSWORD ================= */}
              {accountModalView === 'change_password' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formInstructions}>
                    Enter a new password for your LifeTrack Pro account. Passwords must be at least 6 characters long.
                  </Text>
                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>New Password</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#9B9BAF"
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Re-type new password"
                      placeholderTextColor="#9B9BAF"
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, isChangingPassword && { opacity: 0.7 }]}
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                    activeOpacity={0.8}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ================= VIEW 3: OWNERSHIP & CONTROL ================= */}
              {accountModalView === 'ownership' && (
                <View style={styles.ownershipContainer}>
                  <Text style={styles.ownershipSubtitle}>
                    Choose whether you want to take a temporary break or schedule permanent account deletion.
                  </Text>

                  {/* Option 1: Temporary Deactivation */}
                  <TouchableOpacity
                    style={styles.ownershipCard}
                    onPress={handleDeactivateAccount}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownershipCardHeader}>
                      <View style={[styles.ownershipIconCircle, { backgroundColor: '#F0EFFB' }]}>
                        <Lock size={18} color="#5B4FE8" />
                      </View>
                      <View style={styles.ownershipCardTitleCol}>
                        <Text style={styles.ownershipCardTitle}>Deactivate Account (Temporary)</Text>
                        <Text style={styles.ownershipCardDesc}>
                          Taking a break? Deactivating your account is temporary. Your streaks and profile will be hidden until you log back in.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.ownershipCardActionRow}>
                      <Text style={styles.deactivateActionText}>Take a break</Text>
                      <ChevronRight size={14} color="#5B4FE8" />
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Schedule Deletion */}
                  <TouchableOpacity
                    style={[styles.ownershipCard, { borderColor: '#F2D4D4' }]}
                    onPress={() => setAccountModalView('deletion_wizard')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownershipCardHeader}>
                      <View style={[styles.ownershipIconCircle, { backgroundColor: '#FDF2F2' }]}>
                        <Trash2 size={18} color="#E85858" />
                      </View>
                      <View style={styles.ownershipCardTitleCol}>
                        <Text style={[styles.ownershipCardTitle, { color: '#E85858' }]}>
                          Delete Account (30-Day Grace)
                        </Text>
                        <Text style={styles.ownershipCardDesc}>
                          Deleting your account is permanent after 30 days. You have 30 days to log back in and cancel before data is wiped.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.ownershipCardActionRow}>
                      <Text style={[styles.deactivateActionText, { color: '#E85858' }]}>Continue to deletion</Text>
                      <ChevronRight size={14} color="#E85858" />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* ================= VIEW 4: DELETION WIZARD ================= */}
              {accountModalView === 'deletion_wizard' && (
                <View style={styles.wizardContainer}>
                  {/* Step A: Reason Selector */}
                  <Text style={styles.wizardSectionTitle}>1. Why are you leaving?</Text>
                  <Text style={styles.wizardSubtitle}>Please select a reason to help us improve LifeTrack Pro:</Text>

                  <View style={styles.reasonsList}>
                    {DELETION_REASONS.map((r) => {
                      const isSelected = deletionReason === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                          onPress={() => setDeletionReason(r)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                          <Text style={[styles.reasonRowText, isSelected && styles.reasonRowTextSelected]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Contextual Tip if "Too busy" is selected */}
                  {deletionReason === 'Too busy / Need to focus offline' && (
                    <View style={styles.retentionTipBox}>
                      <Info size={15} color="#5B4FE8" />
                      <Text style={styles.retentionTipText}>
                        💡 Tip: You can pause study notifications in Preferences without losing your focus streaks or XP points!
                      </Text>
                    </View>
                  )}

                  {/* Step B: Identity Verification */}
                  <Text style={[styles.wizardSectionTitle, { marginTop: 20 }]}>2. Confirm your identity</Text>
                  <Text style={styles.wizardSubtitle}>
                    {isOAuthUser
                      ? 'For your security, please type DELETE below in capital letters:'
                      : 'For your security, please re-enter your LifeTrack Pro account password:'}
                  </Text>
                  <TextInput
                    style={styles.wizardInput}
                    placeholder={isOAuthUser ? 'Type DELETE' : 'Enter your password'}
                    placeholderTextColor="#9B9BAF"
                    secureTextEntry={!isOAuthUser}
                    value={deletionPassword}
                    onChangeText={setDeletionPassword}
                    autoCapitalize={isOAuthUser ? 'characters' : 'none'}
                  />

                  {/* Step C: 30-Day Notice Banner */}
                  <View style={styles.recoveryNoticeCard}>
                    <View style={styles.recoveryNoticeHeader}>
                      <Info size={16} color="#5B4FE8" />
                      <Text style={styles.recoveryNoticeTitle}>30-Day Grace Period</Text>
                    </View>
                    <Text style={styles.recoveryNoticeDesc}>
                      Your account will be deactivated today. You will have until{' '}
                      <Text style={{ fontWeight: '700', color: '#17172A' }}>{scheduledPurgeDate}</Text> to log back in
                      and cancel. After this date, all your data will be permanently wiped.
                    </Text>
                  </View>

                  {/* Step D: Final Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.finalDeleteBtn,
                      (!deletionReason || !deletionPassword.trim() || isDeletingAccount || isVerifyingPassword) && {
                        opacity: 0.45,
                      },
                    ]}
                    onPress={handleScheduleDeletion}
                    disabled={!deletionReason || !deletionPassword.trim() || isDeletingAccount || isVerifyingPassword}
                    activeOpacity={0.8}
                  >
                    {isDeletingAccount || isVerifyingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.finalDeleteBtnText}>Schedule Account Deletion</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  signOutButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#E85858',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 26, 0.65)',
    justifyContent: 'flex-end',
  },
  accountModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '88%',
  },
  accountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
  },
  accountModalBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountModalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#17172A',
  },
  accountModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountSectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9BAF',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  accountInfoBox: {
    backgroundColor: '#F8F8FA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECECF0',
  },
  accountInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDF2',
  },
  accountInfoLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#717182',
  },
  accountInfoVal: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#17172A',
    maxWidth: '65%',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF9F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1EAA6B',
  },
  activeBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#1EAA6B',
  },
  accountMenuBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECF0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  accountMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  accountMenuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountMenuTextCol: {
    flex: 1,
  },
  accountMenuTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#17172A',
  },
  accountMenuSub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#8A8A9E',
    marginTop: 1,
  },
  formContainer: {
    paddingVertical: 6,
  },
  formInstructions: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  formInputGroup: {
    marginBottom: 14,
  },
  formInputLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  primaryActionBtn: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  primaryActionBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  ownershipContainer: {
    paddingVertical: 6,
  },
  ownershipSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  ownershipCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  ownershipCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ownershipIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownershipCardTitleCol: {
    flex: 1,
  },
  ownershipCardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#17172A',
    marginBottom: 4,
  },
  ownershipCardDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  ownershipCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    paddingTop: 10,
  },
  deactivateActionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4FE8',
  },
  wizardContainer: {
    paddingVertical: 6,
  },
  wizardSectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#17172A',
    marginBottom: 4,
  },
  wizardSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  reasonRowSelected: {
    borderColor: '#5B4FE8',
    backgroundColor: '#F5F4FE',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#5B4FE8',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5B4FE8',
  },
  reasonRowText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  reasonRowTextSelected: {
    fontFamily: 'DMSans-Medium',
    color: '#17172A',
    fontWeight: '600',
  },
  retentionTipBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  retentionTipText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
    flex: 1,
  },
  wizardInput: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    marginBottom: 16,
  },
  recoveryNoticeCard: {
    backgroundColor: '#F5F4FE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E4FD',
  },
  recoveryNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recoveryNoticeTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#342CA6',
  },
  recoveryNoticeDesc: {
    fontFamily: 'DMSans',
    fontSize: 12,
    lineHeight: 18,
    color: '#5C5887',
  },
  finalDeleteBtn: {
    backgroundColor: '#E85858',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  finalDeleteBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
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
  journalVaultGoldBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  journalVaultGoldBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  journalVaultSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#A8A2B5',
    marginTop: 2,
  },
});
