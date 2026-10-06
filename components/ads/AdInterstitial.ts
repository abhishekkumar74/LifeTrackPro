import { getAdUnitId, AD_FREQUENCY_LIMITS, isAdMobNativeModuleAvailable } from '@/lib/config/ads';
import { AdManager } from './AdManager';

class AdInterstitialManager {
  private interstitial: any = null;
  private isLoaded = false;
  private isLoading = false;
  private lastShownTime = 0;
  private sessionShowCount = 0;

  constructor() {
    this.preload();
  }

  /**
   * Preload an interstitial ad safely
   */
  preload() {
    if (!isAdMobNativeModuleAvailable()) return;
    if (this.isLoading || this.isLoaded) return;

    try {
      const mobileAdsModule = require('react-native-google-mobile-ads');
      const { InterstitialAd, AdEventType } = mobileAdsModule;

      const unitId = getAdUnitId('interstitial');
      this.interstitial = InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.isLoading = true;

      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        this.isLoading = false;
        if (__DEV__) {
          console.log('[AdInterstitial] Preloaded interstitial ad successfully.');
        }
      });

      this.interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        this.isLoaded = false;
        this.isLoading = false;
        if (__DEV__) {
          console.warn('[AdInterstitial] Preload failed silently:', error?.message || error);
        }
      });

      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        this.isLoaded = false;
        this.interstitial = null;
        setTimeout(() => this.preload(), 5000);
      });

      this.interstitial.load();
    } catch (error) {
      this.isLoaded = false;
      this.isLoading = false;
      if (__DEV__) {
        console.warn('[AdInterstitial] Failed to initialize interstitial:', error);
      }
    }
  }

  /**
   * Safely attempt to show an interstitial ad at a natural transition point
   */
  async showAtTransitionPoint(reason: string = 'general'): Promise<boolean> {
    if (!isAdMobNativeModuleAvailable()) return false;
    if (!AdManager.canShowAds()) return false;

    // Check session frequency cap
    if (this.sessionShowCount >= AD_FREQUENCY_LIMITS.MAX_INTERSTITIALS_PER_SESSION) {
      return false;
    }

    // Check time interval frequency cap
    const now = Date.now();
    const timeSinceLastShow = now - this.lastShownTime;
    if (timeSinceLastShow < AD_FREQUENCY_LIMITS.MIN_INTERSTITIAL_INTERVAL_MS) {
      return false;
    }

    if (!this.isLoaded || !this.interstitial) {
      this.preload();
      return false;
    }

    try {
      this.lastShownTime = now;
      this.sessionShowCount += 1;
      await this.interstitial.show();
      if (__DEV__) {
        console.log(`[AdInterstitial] Displayed interstitial for reason: ${reason}`);
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[AdInterstitial] Failed to show interstitial silently:', error);
      }
      this.isLoaded = false;
      this.preload();
      return false;
    }
  }
}

export const AdInterstitial = new AdInterstitialManager();
