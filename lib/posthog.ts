import { PostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/constants/config';

// Fallback to project key if Metro hasn't reloaded environment variables yet
const FALLBACK_KEY = 'phc_xvMPK7Z62cr9FKS5w9AeENosqVVikiUygnpxdUZkB34Z';
const apiKey = CONFIG.posthog.apiKey || process.env.EXPO_PUBLIC_POSTHOG_API_KEY || FALLBACK_KEY;
const host = CONFIG.posthog.host || process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);

/**
 * Global PostHog client instance.
 * Uses AsyncStorage to ensure compatibility with prebuilt dev clients without requiring native rebuilds.
 */
export const posthog = new PostHog(apiKey, {
  host,
  customStorage: AsyncStorage,
  disabled: !isConfigured,
  captureAppLifecycleEvents: true,
  flushAt: 1, // Flush immediately in dev and on first events
  flushInterval: 1000,
});

if (__DEV__) {
  console.log('[PostHog] Initialized with host:', host, '| API Key prefix:', apiKey.slice(0, 8));
}

/**
 * Associates an identified user with their PostHog analytics session.
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!userId) return;
  try {
    posthog.identify(userId, properties);
    posthog.flush().catch(() => {});
    if (__DEV__) {
      console.log('[PostHog] identify:', userId, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[PostHog] identify error:', error);
    }
  }
}

/**
 * Resets user identification and clears user super properties on logout.
 */
export function resetUser() {
  try {
    posthog.reset();
    posthog.flush().catch(() => {});
    if (__DEV__) {
      console.log('[PostHog] reset session');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[PostHog] reset error:', error);
    }
  }
}

/**
 * Captures a custom tracking event with optional properties.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    posthog.capture(eventName, properties);
    posthog.flush().catch(() => {});
    if (__DEV__) {
      console.log('[PostHog] event captured & flushed:', eventName, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[PostHog] capture error:', error);
    }
  }
}

/**
 * Tracks a screen view event with optional properties.
 */
export function screenView(screenName: string, properties?: Record<string, any>) {
  try {
    posthog.screen(screenName, properties);
    posthog.flush().catch(() => {});
    if (__DEV__) {
      console.log('[PostHog] screen captured & flushed:', screenName, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[PostHog] screen error:', error);
    }
  }
}

/**
 * Check if a feature flag is enabled for the current user.
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  try {
    const enabled = await posthog.isFeatureEnabled(flagKey);
    return Boolean(enabled);
  } catch {
    return false;
  }
}

/**
 * Get the value of a feature flag for the current user.
 */
export async function getFeatureFlag(flagKey: string): Promise<string | boolean | undefined> {
  try {
    return await posthog.getFeatureFlag(flagKey);
  } catch {
    return undefined;
  }
}

/**
 * Flushes all pending analytics events to the server.
 */
export async function flushPostHog(): Promise<void> {
  try {
    await posthog.flush();
  } catch (error) {
    if (__DEV__) {
      console.warn('[PostHog] flush error:', error);
    }
  }
}

export default posthog;
