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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase/client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';

export default function ResetPasswordScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);

  // States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* Top Branding Section */}
        <View style={styles.brandingSection}>
          <View style={styles.logoContainer}>
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <Path
                d="M13 6L8 13H12L11 18L16 11H12L13 6Z"
                fill="white"
                stroke="white"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
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
                  isFocused && styles.inputRowContainerFocused,
                  (validationError || errorMessage) && styles.inputRowContainerError,
                ]}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  secureTextEntry
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
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  editable={!isLoading && !successMessage}
                />
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View
                style={[
                  styles.inputRowContainer,
                  isFocused && styles.inputRowContainerFocused,
                  (validationError || errorMessage) && styles.inputRowContainerError,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
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
                  editable={!isLoading && !successMessage}
                />
              </View>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  brandingSection: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    marginTop: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
