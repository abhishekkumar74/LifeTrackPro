import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureIncomingReferral } from '@/lib/utils/referral';

const HAS_CHECKED_REFERRER_KEY = 'lifetrack_install_referrer_checked';

/**
 * Initializes Google Play Install Referrer listener on Android.
 * When a user installs the app from a Play Store campaign link
 * (e.g. https://play.google.com/store/apps/details?id=com.lifetrackpro.app&referrer=utm_source%3Dcampus%26utm_campaign%3Dcollab_abhishek),
 * Google Play stores the referrer string. This function retrieves it via the official
 * Google Play Install Referrer API and passes it to PostHog for attribution.
 */
export async function initPlayInstallReferrer(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const alreadyChecked = await AsyncStorage.getItem(HAS_CHECKED_REFERRER_KEY);
    if (alreadyChecked) {
      if (__DEV__) {
        console.log('[InstallReferrer] Google Play referrer already checked for this device.');
      }
      return;
    }

    // Defensive check: Verify native module exists in this build before requiring
    if (!NativeModules || !NativeModules.PlayInstallReferrer) {
      if (__DEV__) {
        console.log('[InstallReferrer] Native PlayInstallReferrer module is not available in current binary.');
      }
      return;
    }

    // Dynamically require to avoid crash if native module isn't present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PlayInstallReferrer } = require('react-native-play-install-referrer');

    if (!PlayInstallReferrer || typeof PlayInstallReferrer.getInstallReferrerInfo !== 'function') {
      return;
    }

    PlayInstallReferrer.getInstallReferrerInfo(async (info: { installReferrer?: string } | null, error: unknown) => {
      // Mark as checked to prevent repeated queries
      await AsyncStorage.setItem(HAS_CHECKED_REFERRER_KEY, 'true').catch(() => {});

      if (error) {
        if (__DEV__) {
          console.log('[InstallReferrer] Play Install Referrer query response (not from store / dev):', error);
        }
        return;
      }

      if (info && info.installReferrer) {
        const rawReferrer = info.installReferrer;
        if (__DEV__) {
          console.log('[InstallReferrer] Google Play Install Referrer captured:', rawReferrer);
        }

        // Pass directly to the central referral & PostHog attribution engine
        await captureIncomingReferral(rawReferrer);
      }
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[InstallReferrer] Exception querying Play Install Referrer:', err);
    }
  }
}
