import { markStart, markEnd } from '../lib/utils/startup-perf';
markStart('app_boot');

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
import { Platform, UIManager, View, Text, ActivityIndicator, LogBox } from 'react-native';
import { UserProfile } from '@/types/app.types';
import { requestNotificationPermission, useNotificationResponse, scheduleMorningBrief } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

// Ignore non-fatal fetch cancellation/abort, background sync, and network failure redboxes in LogBox
LogBox.ignoreLogs([
  'AbortError',
  'Aborted',
  'canceled',
  'cancelled',
  'Network request failed',
  'TypeError: Network request failed',
  'Error syncing missed routines',
  'Failed to sync missed routines',
  'Not authenticated',
  'Font registration was unsuccessful',
  'Expo AV has been deprecated',
  'UnexpectedException',
  'hostname could not be found',
  'fetch failed',
  'AuthRetryableFetchError',
]);

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
        const timer = setTimeout(async () => {
          try {
            await requestNotificationPermission();
            
            // Schedule daily brief if enabled
            const mb = await AsyncStorage.getItem('pref_morning_brief');
            if (mb === null || mb === 'true') {
              const { data: tasks } = await supabase
                .from('tasks')
                .select('title')
                .is('completed_at', null)
                .limit(1);
              const topTitle = tasks && tasks[0] ? tasks[0].title : 'Complete your daily habits';
              await scheduleMorningBrief(topTitle);
            }
          } catch (err) {
            if (__DEV__) console.warn('Failed requesting notification permission:', err);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [session, profile, segments]);

  if (isLoading) {
    return <BrandedLoadingScreen />;
  }

  return <>{children}</>;
}

function InnerApp({ children }: { children: React.ReactNode }) {
  // Listen for lifecycle changes globally
  useAppLifecycle();
  return <>{children}</>;
}

function RootLayout() {
  // Check for OTA updates on start (deferred by 2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
          Caveat: 'https://fonts.gstatic.com/s/caveat/v18/WncdHAc5bAfYB2Q7ae54EA.ttf',
          Fraunces: 'https://fonts.gstatic.com/s/fraunces/v31/6nuHBaBJf4MeaxHcU3j318b84YpS58A73zp_C852D5oU55k_3q751Z1F.ttf',
          Newsreader: 'https://fonts.gstatic.com/s/newsreader/v25/6nU54q6y8_j9Z0y8eY3W3zNn4bS13p2z.ttf',
          Kalam: 'https://fonts.gstatic.com/s/kalam/v16/KrumBXdLD2N7y8N07t7k.ttf',
          PatrickHand: 'https://fonts.gstatic.com/s/patrickhand/v21/L0x5DF4xlVMF-BfR8bXMIhJPq48.ttf',
          ArchitectsDaughter: 'https://fonts.gstatic.com/s/architectsdaughter/v18/KtkM350A33-of6jX6vG9I83WdSA2yL4.ttf',
          IndieFlower: 'https://fonts.gstatic.com/s/indieflower/v17/1410350A33-of6jX6vG9I83WdSA2.ttf',
          DancingScript: 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-Fv67xpxZ2g.ttf',
          Pacifico: 'https://fonts.gstatic.com/s/pacifico/v22/FwZYrNK-Fv67xpxZ2g.ttf',
          AmaticSC: 'https://fonts.gstatic.com/s/amaticsc/v26/Tavq20NPG20_W-D8fT-I-G3i.ttf',
          CaveatBrush: 'https://fonts.gstatic.com/s/caveatbrush/v16/0FlmB2FpzvjA9KZ3wW3qXn8.ttf',
          NanumPenScript: 'https://fonts.gstatic.com/s/nanumpenscript/v23/m8JVjfNBPaxyHbhX2kF0-W4X2Q.ttf',
          Handlee: 'https://fonts.gstatic.com/s/handlee/v18/5aU19_atWWA67l57MhM.ttf',
          Gaegu: 'https://fonts.gstatic.com/s/gaegu/v17/k3kVo80058Nua3U6xQ.ttf',
          MarckScript: 'https://fonts.gstatic.com/s/marckscript/v17/nF1Y2Z92eS6P-e1jYx-G.ttf',
          NothingYouCouldDo: 'https://fonts.gstatic.com/s/nothingyoucoulddo/v19/o-0bIp19-BD1Sro82IZm9L-13A23pL4.ttf',
          Neucha: 'https://fonts.gstatic.com/s/neucha/v17/q4bMV2DGKK0197v2.ttf',
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
    }).catch(() => {
      setSession(null);
      setProfile(null);
      setLoading(false);
      setAuthInitialized(true);
    });

    // 2. Track authentication session state mutations
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setAuthInitialized(true);
        router.replace('/(auth)/reset-password');
      } else if (event === 'SIGNED_OUT') {
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
      markEnd('app_boot');
    }
  }, [fontsLoaded, authInitialized]);

  if (!fontsLoaded || !authInitialized) {
    return <BrandedLoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <InnerApp>
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
                  <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="habit/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="habits/index" options={{ headerShown: false }} />
                  <Stack.Screen name="routine_analytics" options={{ headerShown: false }} />
                  <Stack.Screen name="routine_detail" options={{ headerShown: false }} />
                </Stack>
                <Toast />
              </ErrorBoundary>
            </AuthGuard>
          </SafeAreaProvider>
        </InnerApp>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
