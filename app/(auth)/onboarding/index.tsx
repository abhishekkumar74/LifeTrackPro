import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase/client';
import SafeScreen from '@/components/shared/SafeScreen';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { UserCategory, UserProfile } from '@/types/app.types';
import { useAuthStore } from '@/lib/store/auth.store';

// Step components
import Step1Profile from './steps/step-1-profile';
import Step2Subcategory from './steps/step-2-subcategory';
import Step3Goal from './steps/step-3-goal';
import Step4Hours from './steps/step-4-hours';
import Step5Confirm from './steps/step-5-confirm';

export interface OnboardingState {
  name: string;
  category: UserCategory | null;
  subcategories: string[];
  customSubcategory?: string;
  goalText: string;
  timeline: string | null;
  hours: number;
  peakTime: 'morning' | 'afternoon' | 'night' | null;
}

const INITIAL_STATE: OnboardingState = {
  name: '',
  category: null,
  subcategories: [],
  customSubcategory: '',
  goalText: '',
  timeline: null,
  hours: 4,
  peakTime: null,
};

const TIMELINE_DAYS: Record<string, number> = {
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
  '2 Years': 730,
  '5 Years': 1825,
};

const TIMELINE_MAP: Record<string, '3M' | '6M' | '1Y' | '2Y' | '5Y'> = {
  '3 Months': '3M',
  '6 Months': '6M',
  '1 Year': '1Y',
  '2 Years': '2Y',
  '5 Years': '5Y',
};

// Animated progress dot subcomponent
function ProgressDot({ index, activeIndex }: { index: number; activeIndex: number }): React.JSX.Element {
  const widthVal = useSharedValue(6);

  useEffect(() => {
    widthVal.value = withTiming(index === activeIndex ? 20 : 6, { duration: 250 });
  }, [activeIndex, index, widthVal]);

  const animStyle = useAnimatedStyle(() => {
    return {
      width: widthVal.value,
      backgroundColor: index === activeIndex ? COLORS.violet : '#E8E7E3',
    };
  });

  return <Animated.View style={[styles.dot, animStyle]} />;
}

export default function OnboardingScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset subcategories if user goes back and changes main category
  const handleStateChange = (updates: Partial<OnboardingState>) => {
    setState((prev) => {
      const nextState = { ...prev, ...updates };
      if (updates.category !== undefined && updates.category !== prev.category) {
        nextState.subcategories = [];
        nextState.customSubcategory = '';
      }
      return nextState;
    });
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return state.name.trim().length > 1 && state.category !== null;
      case 2:
        if (state.subcategories.includes('Other')) {
          return !!state.customSubcategory && state.customSubcategory.trim().length > 2;
        }
        return state.subcategories.length >= 1;
      case 3:
        return state.goalText.trim().length > 10 && state.timeline !== null;
      case 4:
        return state.peakTime !== null;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const navigateToStep = (nextStep: number) => {
    setDirection(nextStep > currentStep ? 'forward' : 'backward');
    setCurrentStep(nextStep);
  };

  const handleContinue = async () => {
    if (!isStepValid() || isLoading) return;

    if (currentStep === 1) {
      navigateToStep(2);
    } else if (currentStep === 2) {
      navigateToStep(3);
    } else if (currentStep === 3) {
      navigateToStep(4);
    } else if (currentStep === 4) {
      navigateToStep(5);
    } else if (currentStep === 5) {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (isLoading) return;

    if (currentStep === 3) {
      navigateToStep(2);
    } else if (currentStep > 1) {
      navigateToStep(currentStep - 1);
    }
  };

  const calculateDeadlineDate = (timelineStr: string | null): string => {
    if (!timelineStr) return new Date().toISOString().split('T')[0];
    const days = TIMELINE_DAYS[timelineStr] || 180;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Retrieve the authenticated user session details
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(userError?.message || 'Authenticated user session not found.');
      }

      // 2. Perform Profile details insertion
      const finalSubcategories = state.subcategories.includes('Other') && state.customSubcategory
        ? [...state.subcategories, state.customSubcategory.trim()]
        : state.subcategories;

      const profileData = {
        id: user.id,
        name: state.name.trim(),
        category: state.category!,
        sub_category: finalSubcategories,
        daily_hours: state.hours,
        peak_time: state.peakTime!,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (profileError) {
        throw new Error(`Profile setup failed: ${profileError.message}`);
      }

      // Fetch the complete profile details from the database and sync the Zustand auth store
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fullProfile) {
        useAuthStore.getState().setProfile(fullProfile as UserProfile);
      } else {
        useAuthStore.getState().setProfile(profileData as unknown as UserProfile);
      }

      // 3. Perform Primary Goal configuration insertion
      const mappedTimeline = state.timeline ? TIMELINE_MAP[state.timeline] : '6M';
      const calculatedDeadline = calculateDeadlineDate(state.timeline);

      const { error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: state.goalText.trim(),
          timeline: mappedTimeline,
          deadline: calculatedDeadline,
          status: 'active',
          is_primary: true,
        });

      if (goalError) {
        // Log critical insertion error
        if (__DEV__) {
          console.error('Goal configuration insertion failed:', goalError);
        }
        throw new Error(`Goal configuration failed: ${goalError.message}`);
      }

      // 4. Default habits seeding
      try {
        const { count, error: countError } = await supabase
          .from('habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          if (__DEV__) {
            console.error('Failed to check existing habits:', countError);
          }
        } else if (count === 0) {
          const defaultHabits = [
            { emoji: '⏰', title: 'Wake up on time',    order_index: 0 },
            { emoji: '💧', title: 'Drink 8 glasses',   order_index: 1 },
            { emoji: '📚', title: 'Study 4 hours',     order_index: 2 },
            { emoji: '🧘', title: 'Meditate',          order_index: 3 },
            { emoji: '🚫', title: 'No sugar today',    order_index: 4 },
          ];

          const { error: seedError } = await supabase.from('habits').insert(
            defaultHabits.map(h => ({
              ...h,
              user_id: user.id,
              frequency: 'daily',
              is_active: true,
            }))
          );

          if (seedError) {
            if (__DEV__) {
              console.error('Failed to seed default habits:', seedError);
            }
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.error('Unexpected error seeding habits:', err);
        }
      }

      // On onboarding complete success
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize profile setup.';
      setErrorMessage(msg);
      if (__DEV__) {
        console.error('Onboarding flow transaction failed:', err);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Profile state={state} onChange={handleStateChange} />;
      case 2:
        return <Step2Subcategory state={state} onChange={handleStateChange} />;
      case 3:
        return <Step3Goal state={state} onChange={handleStateChange} />;
      case 4:
        return <Step4Hours state={state} onChange={handleStateChange} />;
      case 5:
        return (
          <Step5Confirm
            state={state}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        );
      default:
        return null;
    }
  };

  // Setup animated transition direction triggers
  const getTransitions = () => {
    if (direction === 'forward') {
      return {
        entering: SlideInRight.duration(300),
        exiting: SlideOutLeft.duration(300),
      };
    } else {
      return {
        entering: SlideInLeft.duration(300),
        exiting: SlideOutRight.duration(300),
      };
    }
  };

  const transitions = getTransitions();
  const isValid = isStepValid();

  return (
    <SafeScreen mode="fixed" style={styles.container}>
      {/* HEADER SECTION: Back button + Dots row */}
      <View style={styles.header}>
        {currentStep > 1 ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={handleBack}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Go back to previous step"
          >
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        {/* Dynamic Dots Indicator */}
        <View style={styles.dotsRow}>
          {[1, 2, 3, 4, 5].map((val, idx) => (
            <ProgressDot key={val} index={val} activeIndex={currentStep} />
          ))}
        </View>

        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* CORE ANIMATED STEP VIEW */}
      <Animated.View
        key={currentStep}
        entering={transitions.entering}
        exiting={transitions.exiting}
        style={styles.stepContent}
      >
        {renderStepContent()}
      </Animated.View>

      {/* BOTTOM ACTION SECTION */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            (!isValid || isLoading) && styles.submitBtnDisabled,
            isValid && !isLoading && pressed && styles.submitBtnPressed,
          ]}
          onPress={handleContinue}
          disabled={!isValid || isLoading}
          accessibilityRole="button"
          accessibilityLabel={currentStep === 5 ? 'Start My Journey' : 'Continue onboarding'}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.surface} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {currentStep === 5 ? 'Start My Journey →' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#EAE8FD',
    opacity: 0.8,
  },
  backBtnPlaceholder: {
    width: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  stepContent: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-end',
  },
  submitBtn: {
    backgroundColor: COLORS.violet,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.violet,
    opacity: 0.5,
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
