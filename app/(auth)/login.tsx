import CountryPicker, { COUNTRIES, Country } from '@/components/ui/CountryPicker';
import { STRINGS } from '@/constants/strings';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/auth.store';
import { supabase } from '@/lib/supabase/client';
import { UserProfile } from '@/types/app.types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

// Ensure the browser closes the session correctly on web redirect
WebBrowser.maybeCompleteAuthSession();

const screenHeight = Dimensions.get('window').height;

export default function LoginScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);

  // Keyboard state to adjust branding section height dynamically
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Authentication method state (Phone auth hidden for now, phase 2 feature)
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('email');

  // Input states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // India (+91)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // UI states
  const [isFocused, setIsFocused] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isForgotState, setIsForgotState] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger autoFocus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Format phone number dynamically as "XXXXX XXXXX"
  const handlePhoneChange = (text: string): void => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setRawPhoneNumber(cleaned);

    if (cleaned.length <= 5) {
      setPhoneNumber(cleaned);
    } else {
      setPhoneNumber(`${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`);
    }

    if (validationError) setValidationError(null);
    if (errorMessage) setErrorMessage(null);
  };

  // Supabase sign-in call (Phone OTP)
  const handleSendOtp = async (): Promise<void> => {
    if (rawPhoneNumber.length < 10) {
      setValidationError('Mobile number must be exactly 10 digits.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setValidationError(null);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fullPhone = `${selectedCountry.dialCode}${rawPhoneNumber}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        router.push({
          pathname: '/verify-otp',
          params: { phone: fullPhone },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected authentication error occurred.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Supabase sign-in/up call (Email/Password)
  const handleEmailAuth = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setValidationError('Please enter both email and password.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setValidationError(null);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (data.session) {
          router.replace('/(tabs)');
        } else {
          setErrorMessage('Registration successful! Please check your email inbox to confirm your account, then log in here.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (data.session) {
          router.replace('/(tabs)');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected authentication error occurred.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth redirect/native login handler
  const handleGoogleSignIn = async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
        : Linking.createURL('google-auth');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const urlStr = result.url;
          let tokenPart = '';
          const hashIdx = urlStr.indexOf('#');
          const queryIdx = urlStr.indexOf('?');
          if (hashIdx !== -1) {
            tokenPart = urlStr.slice(hashIdx + 1);
          } else if (queryIdx !== -1) {
            tokenPart = urlStr.slice(queryIdx + 1);
          }
          if (tokenPart) {
            const parts = tokenPart.split('&');
            let accessToken = '';
            let refreshToken = '';
            for (const part of parts) {
              const [key, val] = part.split('=');
              if (key === 'access_token') accessToken = decodeURIComponent(val);
              if (key === 'refresh_token') refreshToken = decodeURIComponent(val);
            }
            if (accessToken) {
              const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              if (sessionData?.session) {
                useAuthStore.getState().setSession(sessionData.session);
                router.replace('/(tabs)');
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Auth is currently unavailable.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (!email.trim()) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setValidationError(null);
    setSuccessMessage(null);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'lifetrackpro://reset-password',
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Password reset link sent to your email. Please check your inbox!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isForgotState
    ? (!email || isLoading)
    : (!email || password.length < 6 || isLoading);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* SECTION 1: Top Branding Area */}
        <View style={[styles.brandingSection, isKeyboardOpen && { height: screenHeight * 0.14, justifyContent: 'center', paddingVertical: 6 }]}>
          <View style={[styles.logoContainer, isKeyboardOpen && { width: 44, height: 44, borderRadius: RADIUS.md }]}>
            <Svg width={isKeyboardOpen ? "24" : "36"} height={isKeyboardOpen ? "24" : "36"} viewBox="0 0 24 24" fill="none">
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
          <Text style={[styles.appName, isKeyboardOpen && { fontSize: 22, marginTop: SPACING.xs }]}>{STRINGS.common.appName}</Text>
          {!isKeyboardOpen && <Text style={styles.tagline}>Your life. One app.</Text>}
        </View>

        {/* SECTION 2: Input Area */}
        <View style={styles.inputSection}>
          {isForgotState ? (
            <View style={{ gap: SPACING.md }}>
              <Text style={{ fontFamily: TYPOGRAPHY.fonts.sans, fontSize: 14, color: COLORS.t2, marginBottom: 4, lineHeight: 20 }}>
                Enter the email address associated with your account and we will send you a password recovery link.
              </Text>
              <View>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputRowContainer,
                    isFocused && styles.inputRowContainerFocused,
                    (validationError || errorMessage) && styles.inputRowContainerError,
                  ]}
                >
                  <TextInput
                    ref={emailInputRef}
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="name@example.com"
                    placeholderTextColor={COLORS.t3}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (validationError) setValidationError(null);
                      if (errorMessage) setErrorMessage(null);
                      if (successMessage) setSuccessMessage(null);
                    }}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setIsForgotState(false);
                  setErrorMessage(null);
                  setValidationError(null);
                  setSuccessMessage(null);
                }}
                style={({ pressed }) => [
                  { marginTop: 12, alignSelf: 'center', padding: 8 },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Text style={{ color: COLORS.violet, fontSize: 14, fontFamily: TYPOGRAPHY.fonts.sans, fontWeight: '600' }}>
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: SPACING.md }}>
              <View>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputRowContainer,
                    isFocused && styles.inputRowContainerFocused,
                    (validationError || errorMessage) && styles.inputRowContainerError,
                  ]}
                >
                  <TextInput
                    ref={emailInputRef}
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="name@example.com"
                    placeholderTextColor={COLORS.t3}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (validationError) setValidationError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Password (min. 6 chars)</Text>
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
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (validationError) setValidationError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!isLoading}
                  />
                </View>
                {!isSignUp && (
                  <Pressable
                    onPress={() => {
                      setIsForgotState(true);
                      setErrorMessage(null);
                      setValidationError(null);
                      setSuccessMessage(null);
                    }}
                    style={({ pressed }) => [
                      { alignSelf: 'flex-end', marginTop: 8 },
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <Text style={{ color: COLORS.violet, fontSize: 13, fontFamily: TYPOGRAPHY.fonts.sans, fontWeight: '500' }}>
                      Forgot Password?
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setValidationError(null);
                }}
                style={({ pressed }) => [
                  { marginTop: 4, alignSelf: 'center', padding: 8 },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Text style={{ color: COLORS.violet, fontSize: 14, fontFamily: TYPOGRAPHY.fonts.sans, fontWeight: '600' }}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </Pressable>
            </View>
          )}

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

        {/* SECTION 3: CTA buttons area */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              isSubmitDisabled && styles.submitBtnDisabled,
              !isSubmitDisabled && pressed && styles.submitBtnPressed,
            ]}
            onPress={isForgotState ? handleForgotPassword : handleEmailAuth}
            disabled={isSubmitDisabled}
            accessibilityRole="button"
            accessibilityLabel={isForgotState ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In')}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isForgotState ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Text>
            )}
          </Pressable>

          {/* Google sign-in backup */}
          {!isForgotState && (
            <Pressable
              style={({ pressed }) => [
                styles.googleBtn,
                pressed && styles.googleBtnPressed,
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.googleIconContainer}>
                <Svg width="18" height="18" viewBox="0 0 24 24">
                  <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </Svg>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </Pressable>
          )}

          <Text style={styles.bottomLegalText}>
            By continuing, you agree to our Terms and Privacy Policy
          </Text>
        </View>
      </ScrollView>

      {/* Country Picker Sheet */}
      <CountryPicker
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => setSelectedCountry(country)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  brandingSection: {
    height: screenHeight * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.violet,
    justifyContent: 'center',
    alignItems: 'center',
    // Gradient mock styling for background
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: 32,
    fontWeight: 'normal',
    color: COLORS.t1,
    letterSpacing: -0.5,
    marginTop: SPACING.lg,
  },
  tagline: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t3,
    marginTop: SPACING.xs,
  },
  inputSection: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'flex-start',
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
  countryPickerBtn: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: SPACING.md,
  },
  countryPickerBtnPressed: {
    opacity: 0.7,
  },
  countryPickerText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.t1,
    fontWeight: '600',
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
  },
  submitBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: RADIUS.md + 2, // 14px
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
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md + 2,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  googleBtnPressed: {
    backgroundColor: COLORS.bg,
  },
  googleIconContainer: {
    marginRight: SPACING.md,
  },
  googleBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 16,
    color: COLORS.t1,
    fontWeight: '600',
  },
  bottomLegalText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 12,
    color: COLORS.t3,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 48,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeTabButton: {
    backgroundColor: COLORS.violet,
  },
  tabButtonText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.t3,
  },
  activeTabButtonText: {
    color: COLORS.surface,
  },
  demoBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.violet,
    borderRadius: RADIUS.md + 2,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  demoBtnPressed: {
    opacity: 0.8,
  },
  demoBtnText: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: 15,
    color: COLORS.violet,
    fontWeight: '600',
  },
});

