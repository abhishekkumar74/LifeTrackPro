import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    
    // Only send errors in production
    enabled: !__DEV__,
    
    // Sample rate: 100% of errors,
    // 10% of performance traces
    tracesSampleRate: 0.1,
    
    // App version from app.json
    release: Constants.expoConfig?.version,
    
    // Never send PII
    beforeSend(event) {
      // Strip any user phone numbers
      // from breadcrumbs or messages
      if (event.message) {
        event.message = event.message
          .replace(/\+?\d{10,13}/g, '[phone]');
      }
      return event;
    },
    
    // Ignore non-actionable errors
    ignoreErrors: [
      'Network request failed',
      'Load failed',
      'AbortError',
      'cancelled',
    ],
  });
}

export function setSentryUser(userId: string) {
  // Only set ID — never name or phone
  Sentry.setUser({ id: userId });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function captureError(
  error: unknown,
  context?: Record<string, string>
) {
  const errStr = typeof error === 'string'
    ? error
    : (error as any)?.message || (error as any)?.name || '';

  const isIgnored = [
    'Network request failed',
    'Load failed',
    'AbortError',
    'aborted',
    'cancelled'
  ].some(ignored => errStr.toLowerCase().includes(ignored.toLowerCase()));

  if (isIgnored) {
    if (__DEV__) {
      console.log('[Ignored Error]', error);
    }
    return;
  }

  if (__DEV__) {
    console.error('[Error]', error);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}
