import * as Sentry from '@sentry/react-native';
import { initSentry, setSentryUser, clearSentryUser } from '@/lib/sentry';
import { checkForUpdate } from '@/lib/update-checker';
import { useAppLifecycle } from '@/lib/hooks/use-app-lifecycle';

// Call immediately on module load
initSentry();

import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { CONFIG } from '@/constants/config';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import LoadingScreen from '@/components/shared/LoadingScreen';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Toast } from '@/components/shared/Toast';
import { Platform, UIManager, View, Text, ActivityIndicator } from 'react-native';
import { UserProfile } from '@/types/app.types';
import { requestNotificationPermission, useNotificationResponse } from '@/lib/notifications';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Ensure the splash screen stays visible during bootstrapping
SplashScreen.preventAutoHideAsync();


function BrandedLoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F3', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'InstrumentSerif', fontSize: 32, color: '#17172A' }}>
        LifeTrack Pro
      </Text>
      <ActivityIndicator color="#5B4FE8" style={{ marginTop: 24 }} />
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // If auth state is still resolving, do not perform navigation checks
    if (isLoading) return;

    const segmentsArray = segments as string[];
    const inAuthGroup = segmentsArray.includes('(auth)');
    const inOnboardingGroup = segmentsArray.includes('onboarding');

    if (!session) {
      // Unauthenticated users must be forced onto the login page
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (!profile) {
      // Authenticated users with no profile setup must onboarding
      if (!inOnboardingGroup) {
        router.replace('/onboarding');
      }
    } else {
      // Authenticated users with active profiles are routed to the dashboard
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/');
      }
    }
  }, [session, profile, isLoading, segments]);

  useEffect(() => {
    if (session && profile) {
      const segmentsArray = segments as string[];
      const inOnboardingGroup = segmentsArray.includes('onboarding');
      const inAuthGroup = segmentsArray.includes('(auth)');
      if (!inOnboardingGroup && !inAuthGroup) {
        requestNotificationPermission().catch((err) => {
          if (__DEV__) console.warn('Failed requesting notification permission:', err);
        });
      }
    }
  }, [session, profile, segments]);

  if (isLoading) {
    return <BrandedLoadingScreen />;
  }

  return <>{children}</>;
}

function RootLayout() {
  // Check for OTA updates on start
  useEffect(() => {
    checkForUpdate();
  }, []);

  // Listen for lifecycle changes globally
  useAppLifecycle();

  // Listen for notification taps globally
  useNotificationResponse();

  // Diagnostic log to check if environment variables are successfully parsed by the Metro compiler
  if (__DEV__) {
    console.log('====================================');
    console.log('LifeTrack Pro Startup Diagnostic');
    console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('CONFIG Supabase URL:', CONFIG.supabase.url);
    console.log('====================================');
  }

  // Load custom typography scales matching the design tokens
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
          InstrumentSerif: require('../assets/fonts/InstrumentSerif-Regular.ttf'),
          DMSans: require('../assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
          'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
          DMMono: require('../assets/fonts/DMMono-Regular.ttf'),
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('Font loading warning (handled gracefully):', error);
        }
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  const { setLoading, setSession, setProfile } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Handle incoming deep links (e.g. lifetrackpro://google-auth)
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      
      const ALLOWED_SCHEME = 'lifetrackpro://';
      const ALLOWED_HTTPS = 'https://lifetrackpro.com';
      
      if (!url.startsWith(ALLOWED_SCHEME) && !url.startsWith(ALLOWED_HTTPS)) {
        if (__DEV__) {
          console.warn('Blocked unknown deep link:', url);
        }
        return;
      }
      
      if (__DEV__) {
        console.log('Incoming deep link captured');
      }
      
      const extractTokens = (urlStr: string) => {
        let tokenPart = '';
        const hashIdx = urlStr.indexOf('#');
        if (hashIdx !== -1) {
          tokenPart = urlStr.slice(hashIdx + 1);
        } else {
          const queryIdx = urlStr.indexOf('?');
          if (queryIdx !== -1) {
            tokenPart = urlStr.slice(queryIdx + 1);
          }
        }
        if (!tokenPart) return null;

        const parts = tokenPart.split('&');
        let accessToken = '';
        let refreshToken = '';
        for (const part of parts) {
          const [key, val] = part.split('=');
          if (key === 'access_token') accessToken = decodeURIComponent(val);
          if (key === 'refresh_token') refreshToken = decodeURIComponent(val);
        }
        return accessToken ? { accessToken, refreshToken } : null;
      };

      const tokens = extractTokens(url);
      if (tokens) {
        setLoading(true);
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken || '',
          });
          if (error) {
            if (__DEV__) {
              console.error('Failed to set session from deep link:', error.message);
            }
          } else if (data.session) {
            if (__DEV__) {
              console.log('Successfully established session from deep link');
            }
            setSession(data.session);
            await fetchProfile(data.session.user.id);
          }
        } catch (err) {
          if (__DEV__) {
            console.error('Unexpected error setting session from deep link:', err);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    // 1. Check if the app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // 2. Listen to incoming deep links while the app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch the custom UserProfile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (__DEV__) {
          console.warn('Profile fetch warning (expected if user has no profile yet):', error.message);
        }
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Unexpected error fetching user profile:', err);
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Font errors are caught and handled gracefully in the loading useEffect

  useEffect(() => {
    // 1. Resolve initial Supabase user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setSentryUser(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
      setAuthInitialized(true);
    });

    // 2. Track authentication session state mutations
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSentryUser();
        useAuthStore.getState().clearAuth();
        queryClient.clear();
        router.replace('/login');
      } else {
        setSession(session);
        if (session) {
          setSentryUser(session.user.id);
          fetchProfile(session.user.id);
        } else {
          clearSentryUser();
          setProfile(null);
          setLoading(false);
        }
      }
      setAuthInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Dismiss splash screen once typography has loaded and session is checked
  useEffect(() => {
    if (fontsLoaded && authInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authInitialized]);

  if (!fontsLoaded || !authInitialized) {
    return <BrandedLoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthGuard>
            <ErrorBoundary>
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)/login" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(auth)/onboarding/index" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="rooms/index" options={{ headerShown: false }} />
                <Stack.Screen name="rooms/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="habit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="habits/index" options={{ headerShown: false }} />
              </Stack>
              <Toast />
            </ErrorBoundary>
          </AuthGuard>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
