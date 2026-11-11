import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { AppLogo } from '@/components/ui/AppLogo';
import { Eye, EyeOff } from 'lucide-react-native';

export default function ResetPasswordScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFieldFocus = (field: 'password' | 'confirmPassword') => {
    setFocusedField(field);
    if (field === 'confirmPassword') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const isPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword && password.length >= 6;

  const handleResetPassword = async (): Promise<void> => {
    if (!password.trim() || !confirmPassword.trim()) {
      setValidationError('Please fill in both password fields.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setValidationError(null);
    setSuccessMessage(null);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Password reset successfully! Redirecting to login...');
        
        // Log out user to clear the reset session, then redirect to login screen
        setTimeout(async () => {
          try {
            await supabase.auth.signOut();
          } catch (e) {
            // ignore sign out error on redirect
          }
          router.replace('/login');
        }, 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = !password || password.length < 6 || password !== confirmPassword || isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Platform.OS === 'android' ? 16 : Math.max(insets.top, 16) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" translucent={false} />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formResponsiveContainer}>
          {/* Top Branding Section */}
        <View style={styles.brandingSection}>
          <View style={styles.logoContainer}>
            <AppLogo size={40} variant="dark" />
          </View>
          <Text style={styles.appName}>{STRINGS.common.appName}</Text>
          <Text style={styles.tagline}>Reset Password</Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.description}>
            Please enter your new password below. It must be at least 6 characters.
          </Text>

          <View style={{ gap: SPACING.md }}>
            <View>
              <Text style={styles.inputLabel}>New Password (min. 6 chars)</Text>
              <View
                style={[
                  styles.inputRowContainer,
                  focusedField === 'password' && styles.inputRowContainerFocused,
                  (validationError || errorMessage) && styles.inputRowContainerError,
                ]}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.textInput, { flex: 1, paddingRight: 8 }]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.t3}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => handleFieldFocus('password')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading && !successMessage}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.t3} />
                  ) : (
                    <Eye size={20} color={COLORS.t3} />
                  )}
                </Pressable>
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View
                style={[
                  styles.inputRowContainer,
                  focusedField === 'confirmPassword' && styles.inputRowContainerFocused,
                  (isPasswordMismatch || validationError || errorMessage) && styles.inputRowContainerError,
                ]}
              >
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={[styles.textInput, { flex: 1, paddingRight: 8 }]}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.t3}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (validationError) setValidationError(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => handleFieldFocus('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!isSubmitDisabled) handleResetPassword();
                  }}
                  editable={!isLoading && !successMessage}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={COLORS.t3} />
                  ) : (
                    <Eye size={20} color={COLORS.t3} />
                  )}
                </Pressable>
              </View>
              {isPasswordMismatch && (
                <Text style={styles.errorText}>Passwords do not match.</Text>
              )}
              {isPasswordMatch && (
                <Text style={styles.matchText}>Passwords match.</Text>
              )}
            </View>
          </View>

          {/* Validation, Success or Supabase Error display */}
          {successMessage && (
            <Text style={styles.successText}>
              {successMessage}
            </Text>
          )}
          {(validationError || errorMessage) && (
            <Text style={styles.errorText}>
              {validationError || errorMessage}
            </Text>
          )}
        </View>

        {/* CTA buttons area */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              isSubmitDisabled && styles.submitBtnDisabled,
              !isSubmitDisabled && pressed && styles.submitBtnPressed,
            ]}
            onPress={handleResetPassword}
            disabled={isSubmitDisabled || !!successMessage}
            accessibilityRole="button"
            accessibilityLabel="Update Password"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace('/login')}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.7 }
            ]}
            disabled={isLoading || !!successMessage}
          >
            <Text style={styles.cancelBtnText}>Back to Login</Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  formResponsiveContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingVertical: SPACING.md,
  },
  brandingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 28,
    color: COLORS.t1,
    marginTop: SPACING.md,
  },
  tagline: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 18,
    color: COLORS.t2,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  inputSection: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-start',
  },
  description: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    color: COLORS.t2,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.t2,
    marginBottom: SPACING.sm,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 56,
    paddingHorizontal: SPACING.lg,
  },
  inputRowContainerFocused: {
    borderColor: COLORS.violet,
  },
  inputRowContainerError: {
    borderColor: COLORS.coral,
  },
  textInput: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: 16,
    color: COLORS.t1,
    height: '100%',
    paddingVertical: 0,
  },
  errorText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.coral,
    marginTop: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  matchText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: '#00B894',
    marginTop: SPACING.sm,
    paddingLeft: SPACING.xs,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 13,
    color: '#00B894',
    marginTop: SPACING.sm,
    paddingLeft: SPACING.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  ctaSection: {
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: RADIUS.md + 2,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  cancelBtn: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 10,
  },
  cancelBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.violet,
  },
});
