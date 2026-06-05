import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';

const screenWidth = Dimensions.get('window').width;

export default function VerifyOtpScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  // State hooks
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInputIndex, setActiveInputIndex] = useState(0);

  // References to the TextInput components
  const inputsRef = useRef<Array<TextInput | null>>([]);

  // Shake animation shared value
  const translateX = useSharedValue(0);

  // Focus tracking ref
  useEffect(() => {
    // Focus first field on mount
    const timer = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Shake animation trigger
  const shake = (): void => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Dynamic formatting for timer: e.g. "0:45"
  const getFormattedTime = (): string => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Resend OTP call
  const handleResendOtp = async (): Promise<void> => {
    if (timer > 0) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimer(60);
    setErrorMessage(null);
    setIsError(false);
    setCode(['', '', '', '', '', '']);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone as string,
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend authentication code.';
      setErrorMessage(message);
    } finally {
      // Focus first input box
      inputsRef.current[0]?.focus();
    }
  };

  // Submit OTP code for verification
  const handleVerifyOtp = async (finalCode: string): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsError(false);

    try {
      const { data: { user }, error } = await supabase.auth.verifyOtp({
        phone: phone as string,
        token: finalCode,
        type: 'sms',
      });

      if (error) {
        await handleFailure(error.message);
        return;
      }

      if (user) {
        // Check if profile details already exist in public profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        // Trigger native Success haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (profile && !profileError) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      await handleFailure(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle failure logic cleanly
  const handleFailure = async (message: string): Promise<void> => {
    // Trigger native Error haptic feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    setIsError(true);
    setErrorMessage('Incorrect code. Try again.');
    shake();
    
    // Clear code cells
    setCode(['', '', '', '', '', '']);
    
    // Focus first input box
    inputsRef.current[0]?.focus();
  };

  // Individual character input change
  const handleChangeText = (text: string, index: number): void => {
    if (isError) {
      setIsError(false);
      setErrorMessage(null);
    }

    const cleaned = text.replace(/\D/g, '');
    
    // Handle pasting 6 digits code directly
    if (cleaned.length === 6) {
      const splitCode = cleaned.split('');
      setCode(splitCode);
      inputsRef.current[5]?.focus();
      handleVerifyOtp(cleaned);
      return;
    }

    const singleDigit = cleaned.slice(-1);
    const newCode = [...code];
    newCode[index] = singleDigit;
    setCode(newCode);

    if (singleDigit !== '') {
      if (index < 5) {
        inputsRef.current[index + 1]?.focus();
      } else {
        // Auto submit when 6th digit entered
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleVerifyOtp(fullCode);
        }
      }
    }
  };

  // Handle backspace keystrokes to regress index
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number): void => {
    if (e.nativeEvent.key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputsRef.current[index - 1]?.focus();
      } else if (code[index] !== '') {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  const isSubmitDisabled = code.some((char) => char === '') || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* TOP HEADER SECTION */}
      <View style={[styles.headerSection, { paddingTop: insets.top + SPACING.md }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to login screen"
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 12H5M12 19l-7-7 7-7" />
          </Svg>
        </Pressable>

        <Text style={styles.heading}>Enter the code</Text>
        <Text style={styles.subtext}>We sent a 6-digit code to</Text>
        <Text style={styles.phoneLabel}>{phone}</Text>
      </View>

      {/* MID SECTION: 6 OTP CELLS */}
      <View style={styles.otpSection}>
        <Animated.View style={[styles.otpRowContainer, animatedStyle]}>
          {code.map((digit, idx) => {
            const isInputFocused = activeInputIndex === idx;
            const isFilled = digit !== '';

            return (
              <View
                key={idx}
                style={[
                  styles.otpCellContainer,
                  isInputFocused && styles.otpCellFocused,
                  isFilled && styles.otpCellFilled,
                  isError && styles.otpCellError,
                ]}
              >
                <TextInput
                  ref={(ref) => {
                    inputsRef.current[idx] = ref;
                  }}
                  style={styles.otpTextInput}
                  keyboardType="number-pad"
                  maxLength={6} // High max length allowed on first field to support paste
                  value={digit}
                  onChangeText={(text) => handleChangeText(text, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  onFocus={() => {
                    setActiveInputIndex(idx);
                    if (isError) {
                      setIsError(false);
                      setErrorMessage(null);
                    }
                  }}
                  selectTextOnFocus
                  editable={!isLoading}
                />
              </View>
            );
          })}
        </Animated.View>

        {/* Display validation or auth errors */}
        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {/* RESEND LINK AND TIMERS */}
        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive it? </Text>
          {timer > 0 ? (
            <Text style={styles.timerText}>Resend in {getFormattedTime()}</Text>
          ) : (
            <Pressable onPress={handleResendOtp}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* CTA FOOTER */}
      <View style={[styles.ctaSection, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            isSubmitDisabled && styles.submitBtnDisabled,
            !isSubmitDisabled && pressed && styles.submitBtnPressed,
          ]}
          onPress={() => handleVerifyOtp(code.join(''))}
          disabled={isSubmitDisabled}
          accessibilityRole="button"
          accessibilityLabel="Verify credentials and continue"
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.surface} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Verify & Continue</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerSection: {
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  heading: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 32,
    color: COLORS.navy,
    marginTop: 24,
  },
  subtext: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t3,
    marginTop: SPACING.sm,
  },
  phoneLabel: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: SPACING.xs,
  },
  otpSection: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.huge,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  otpRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  otpCellContainer: {
    width: (screenWidth - 40 - 50) / 6, // Dynamic sizing keeping 10px spacing
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFocused: {
    borderColor: COLORS.violet,
  },
  otpCellFilled: {
    borderColor: COLORS.violet,
    backgroundColor: COLORS.violetSoft,
  },
  otpCellError: {
    borderColor: COLORS.coral,
    backgroundColor: COLORS.surface,
  },
  otpTextInput: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.t1,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  errorText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.coral,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  resendPrompt: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t3,
  },
  timerText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: COLORS.t3,
  },
  resendLink: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.violet,
  },
  ctaSection: {
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-end',
  },
  submitBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: RADIUS.md + 2,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
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
