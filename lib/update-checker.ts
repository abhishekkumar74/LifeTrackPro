import * as Updates from 'expo-updates';
import { captureError } from './sentry';

export async function checkForUpdate() {
  // Only run in production
  if (__DEV__) return;
  
  try {
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Reload app with new bundle
      await Updates.reloadAsync();
    }
  } catch (error) {
    // OTA failure is non-fatal
    // Log to Sentry but don't show user
    captureError(error, { 
      context: 'ota_update_check' 
    });
  }
}
