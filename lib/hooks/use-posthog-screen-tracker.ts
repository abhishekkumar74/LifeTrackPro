import { useEffect, useRef } from 'react';
import { usePathname, useGlobalSearchParams } from 'expo-router';
import { screenView } from '@/lib/posthog';

function formatScreenName(pathname: string): string {
  if (!pathname || pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') {
    return 'Dashboard';
  }

  // Friendly human-readable screen names for common routes
  const routeMap: Record<string, string> = {
    '/(tabs)/habits': 'Habits',
    '/(tabs)/focus': 'Focus Timer',
    '/(tabs)/goals': 'Goals',
    '/(tabs)/analytics': 'Analytics',
    '/(auth)/login': 'Login',
    '/(auth)/register': 'Register',
    '/(auth)/onboarding': 'Onboarding',
    '/(auth)/onboarding/index': 'Onboarding',
    '/(auth)/reset-password': 'Reset Password',
    '/rooms': 'Study Rooms',
    '/rooms/index': 'Study Rooms',
    '/notifications': 'Notifications',
    '/profile': 'Profile',
    '/paywall': 'Paywall',
    '/routine_analytics': 'Routine Analytics',
    '/routine_detail': 'Routine Detail',
    '/habits': 'Habit Management',
  };

  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  if (pathname.startsWith('/rooms/')) {
    return 'Study Room Detail';
  }
  if (pathname.startsWith('/habit/')) {
    return 'Habit Detail';
  }

  // Generic fallback: strip route grouping parentheses and format
  return pathname
    .replace(/\/\([^)]+\)/g, '')
    .split('/')
    .filter(Boolean)
    .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ') || 'Screen';
}

/**
 * Automatically tracks screen views in PostHog when navigation routes change in Expo Router.
 */
export function usePostHogScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const lastScreenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const screenName = formatScreenName(pathname);

    // Prevent duplicate screen events for identical route
    if (lastScreenRef.current === pathname) {
      return;
    }
    lastScreenRef.current = pathname;

    screenView(screenName, {
      path: pathname,
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }, [pathname, params]);
}

export default usePostHogScreenTracker;
