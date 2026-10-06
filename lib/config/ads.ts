import { Platform, NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Check if RNGoogleMobileAdsModule is registered in the native binary
 */
export const isAdMobNativeModuleAvailable = (): boolean => {
  if (Platform.OS === 'web') return false;
  try {
    const turbo = TurboModuleRegistry?.get ? TurboModuleRegistry.get('RNGoogleMobileAdsModule') : null;
    const legacy = NativeModules?.RNGoogleMobileAdsModule;
    if (turbo || legacy) return true;

    // Fallback for TurboModule lazy loading on Android/iOS
    const mobileAdsModule = require('react-native-google-mobile-ads');
    return Boolean(mobileAdsModule && mobileAdsModule.default);
  } catch (e) {
    return false;
  }
};

/**
 * Official Google AdMob Test Unit IDs
 */
export const GOOGLE_TEST_IDS = {
  ANDROID: {
    BANNER: 'ca-app-pub-3940256099942544/9214589741',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
    REWARDED: 'ca-app-pub-3940256099942544/5224354917',
    APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  },
  IOS: {
    BANNER: 'ca-app-pub-3940256099942544/2934735716',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
    REWARDED: 'ca-app-pub-3940256099942544/1712485313',
    APP_OPEN: 'ca-app-pub-3940256099942544/5632435128',
  },
};

/**
 * Environment configuration
 */
export const isDevelopment = __DEV__;

// Force test ads in dev or when EXPO_PUBLIC_ADMOB_USE_TEST_ADS is 'true'
export const isTestAdEnabled =
  isDevelopment ||
  process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === 'true' ||
  process.env.EXPO_PUBLIC_ADMOB_ENVIRONMENT !== 'production';

export const isProduction = !isDevelopment && !isTestAdEnabled;

/**
 * Get Ad Unit ID based on ad type and current environment
 */
export const getAdUnitId = (
  adType: 'banner' | 'interstitial' | 'rewarded' | 'app_open'
): string => {
  const isAndroid = Platform.OS === 'android';

  // Always use official Test Unit IDs when in test mode or dev
  if (isTestAdEnabled) {
    switch (adType) {
      case 'banner':
        return isAndroid ? GOOGLE_TEST_IDS.ANDROID.BANNER : GOOGLE_TEST_IDS.IOS.BANNER;
      case 'interstitial':
        return isAndroid ? GOOGLE_TEST_IDS.ANDROID.INTERSTITIAL : GOOGLE_TEST_IDS.IOS.INTERSTITIAL;
      case 'rewarded':
        return isAndroid ? GOOGLE_TEST_IDS.ANDROID.REWARDED : GOOGLE_TEST_IDS.IOS.REWARDED;
      case 'app_open':
        return isAndroid ? GOOGLE_TEST_IDS.ANDROID.APP_OPEN : GOOGLE_TEST_IDS.IOS.APP_OPEN;
      default:
        return GOOGLE_TEST_IDS.ANDROID.BANNER;
    }
  }

  // Production Ad Unit IDs from environment variables
  if (isAndroid) {
    switch (adType) {
      case 'banner':
        return process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || GOOGLE_TEST_IDS.ANDROID.BANNER;
      case 'interstitial':
        return process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID || GOOGLE_TEST_IDS.ANDROID.INTERSTITIAL;
      case 'rewarded':
        return process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID || GOOGLE_TEST_IDS.ANDROID.REWARDED;
      case 'app_open':
        return process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN_ID || GOOGLE_TEST_IDS.ANDROID.APP_OPEN;
    }
  } else {
    switch (adType) {
      case 'banner':
        return process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || GOOGLE_TEST_IDS.IOS.BANNER;
      case 'interstitial':
        return process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID || GOOGLE_TEST_IDS.IOS.INTERSTITIAL;
      case 'rewarded':
        return process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID || GOOGLE_TEST_IDS.IOS.REWARDED;
      case 'app_open':
        return process.env.EXPO_PUBLIC_ADMOB_IOS_APP_OPEN_ID || GOOGLE_TEST_IDS.IOS.APP_OPEN;
    }
  }

  return GOOGLE_TEST_IDS.ANDROID.BANNER;
};

/**
 * Production Config Safety Validation Check
 */
export const validateAdConfigForProduction = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (process.env.EXPO_PUBLIC_ADMOB_ENVIRONMENT === 'production') {
    if (process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === 'true') {
      errors.push('EXPO_PUBLIC_ADMOB_USE_TEST_ADS is set to "true" in production environment!');
    }

    const androidBanner = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;
    if (!androidBanner || androidBanner === GOOGLE_TEST_IDS.ANDROID.BANNER) {
      errors.push('Missing or test EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID in production!');
    }

    const androidInterstitial = process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;
    if (!androidInterstitial || androidInterstitial === GOOGLE_TEST_IDS.ANDROID.INTERSTITIAL) {
      errors.push('Missing or test EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID in production!');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Frequency Capping Configuration
 */
export const AD_FREQUENCY_LIMITS = {
  MIN_INTERSTITIAL_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes between interstitial ads
  MAX_INTERSTITIALS_PER_SESSION: 3,
};
