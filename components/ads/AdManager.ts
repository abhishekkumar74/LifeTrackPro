import { isTestAdEnabled, isAdMobNativeModuleAvailable } from '@/lib/config/ads';

class AdManagerClass {
  private isInitialized = false;
  private isFocusSessionActive = false;
  private isAvailable = false;

  constructor() {
    this.isAvailable = isAdMobNativeModuleAvailable();
  }

  /**
   * Initialize Google Mobile Ads SDK safely
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (!isAdMobNativeModuleAvailable()) {
      if (__DEV__) {
        console.log('[AdManager] RNGoogleMobileAdsModule is not present in native binary (e.g. Expo Go). Ads are safely disabled.');
      }
      return false;
    }

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
      if (__DEV__) {
        console.warn('[AdManager] SDK initialization failed silently:', error);
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
    return isAdMobNativeModuleAvailable();
  }
}

export const AdManager = new AdManagerClass();
