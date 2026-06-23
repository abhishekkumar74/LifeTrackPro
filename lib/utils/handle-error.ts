import { useUiStore } from '../store/ui.store';
import { captureError } from '../sentry';
import NetInfo from '@react-native-community/netinfo';

export function handleSupabaseError(
  error: unknown,
  context: string
): void {
  if (!error) return;

  const err = error as any;
  const message = err?.message || '';
  const isAbort = 
    message.includes('AbortError') || 
    message.includes('aborted') || 
    message.includes('cancelled') ||
    err?.name === 'AbortError';

  if (isAbort) {
    if (__DEV__) {
      console.log(`[Request Aborted] Context: ${context}`, error);
    }
    return;
  }

  const status = err?.status ?? err?.code;

  // User-friendly messages per error type
  const userMessage = (() => {
    if (status === 401 || status === 403) {
      return 'Please log in again';
    }
    if (status === 429) {
      return 'Too many requests. Wait a moment.';
    }
    if (status === 500 || status === 503) {
      return 'Server error. Try again shortly.';
    }
    if (err?.message?.includes('fetch')) {
      return 'Check your internet connection';
    }
    if (err?.message?.includes('abort')) {
      return 'Request timed out. Try again.';
    }
    return 'Something went wrong';
  })();

  // Check connectivity dynamically
  NetInfo.fetch().then((state) => {
    if (!state.isConnected) {
      useUiStore.getState().showToast(
        'No internet connection. Changes will sync when online.',
        'info'
      );
    } else {
      useUiStore.getState().showToast(
        userMessage,
        'error'
      );
    }
  }).catch(() => {
    // Fallback if NetInfo check fails
    useUiStore.getState().showToast(userMessage, 'error');
  });

  // Log to Sentry
  captureError(error, { context });
}
