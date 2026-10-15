import * as Updates from 'expo-updates';
import { captureError } from './sentry';

export async function checkForUpdate() {
  // Only run in production
  if (__DEV__) return;
  
  try {
    if (!Updates.isEnabled) {
      console.log('[Updates] Updates are not enabled on this client.');
      return;
    }
    
    console.log(`[Updates] Checking on channel "${Updates.channel}" (runtime: ${Updates.runtimeVersion})...`);
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('[Updates] New update found! Downloading...');
      await Updates.fetchUpdateAsync();
      // Reload app with new bundle
      console.log('[Updates] Applying update and reloading...');
      await Updates.reloadAsync();
    } else {
      console.log('[Updates] App is currently up-to-date.');
    }
  } catch (error) {
    // OTA failure is non-fatal
    // Log to Sentry but don't show user
    captureError(error, { 
      context: 'ota_update_check',
      channel: Updates.channel ?? 'null',
      runtimeVersion: Updates.runtimeVersion ?? 'null',
      updateId: Updates.updateId ?? 'null',
    });
  }
}
