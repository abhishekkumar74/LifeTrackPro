import { Platform } from 'react-native';
import { isTestAdEnabled, isAdMobNativeModuleAvailable } from '@/lib/config/ads';

class AdManagerClass {
  private isInitialized = false;
  private isFocusSessionActive = false;
  private isAvailable = true;

  constructor() {
    this.isAvailable = Platform.OS !== 'web';
  }

  /**
   * Initialize Google Mobile Ads SDK safely
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web') {
      this.isAvailable = false;
      return false;
    }

    if (this.isInitialized) return true;

    try {
      const mobileAdsModule = require('react-native-google-mobile-ads');
      const mobileAds = mobileAdsModule.default;
      const { MaxAdContentRating } = mobileAdsModule;

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      const adapterStatuses = await mobileAds().initialize();
      this.isInitialized = true;
      this.isAvailable = true;

      if (__DEV__) {
        console.log('[AdManager] Google Mobile Ads initialized successfully:', adapterStatuses);
      }
      return true;
    } catch (error) {
      this.isInitialized = false;
      this.isAvailable = false;
      if (__DEV__) {
        console.warn('[AdManager] SDK initialization failed (e.g. Expo Go without native module):', error);
      }
      return false;
    }
  }

  /**
   * Set active focus mode state (Focus sessions must NEVER be interrupted by ads)
   */
  setFocusSessionActive(active: boolean) {
    this.isFocusSessionActive = active;
  }

  /**
   * Check if ads are allowed to show right now
   */
  canShowAds(): boolean {
    if (Platform.OS === 'web') {
      return false;
    }
    if (!this.isAvailable && !isAdMobNativeModuleAvailable()) {
      return false;
    }
    if (this.isFocusSessionActive) {
      if (__DEV__) {
        console.log('[AdManager] Suppressing ads because Focus Session is active.');
      }
      return false;
    }
    return true;
  }

  /**
   * Helper to check if currently in test mode
   */
  get isTestMode(): boolean {
    return isTestAdEnabled;
  }

  get isNativeModuleAvailable(): boolean {
    return Platform.OS !== 'web' && (this.isAvailable || isAdMobNativeModuleAvailable());
  }
}

export const AdManager = new AdManagerClass();
