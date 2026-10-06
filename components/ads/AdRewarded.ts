import { getAdUnitId, isAdMobNativeModuleAvailable } from '@/lib/config/ads';
import { AdManager } from './AdManager';

class AdRewardedManager {
  private rewarded: any = null;
  private isLoaded = false;
  private isLoading = false;

  constructor() {
    this.preload();
  }

  /**
   * Preload rewarded video ad safely
   */
  preload() {
    if (!isAdMobNativeModuleAvailable()) return;
    if (this.isLoading || this.isLoaded) return;

    try {
      const mobileAdsModule = require('react-native-google-mobile-ads');
      const { RewardedAd, RewardedAdEventType } = mobileAdsModule;

      const unitId = getAdUnitId('rewarded');
      this.rewarded = RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.isLoading = true;

      this.rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isLoaded = true;
        this.isLoading = false;
        if (__DEV__) {
          console.log('[AdRewarded] Preloaded rewarded ad successfully.');
        }
      });

      this.rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
        if (__DEV__) {
          console.log('[AdRewarded] User earned reward:', reward);
        }
      });

      this.rewarded.addAdEventListener('error', (error: any) => {
        this.isLoaded = false;
        this.isLoading = false;
        if (__DEV__) {
          console.warn('[AdRewarded] Preload failed silently:', error?.message || error);
        }
      });

      this.rewarded.addAdEventListener('closed', () => {
        this.isLoaded = false;
        this.rewarded = null;
        setTimeout(() => this.preload(), 5000);
      });

      this.rewarded.load();
    } catch (error) {
      this.isLoaded = false;
      this.isLoading = false;
      if (__DEV__) {
        console.warn('[AdRewarded] Failed to initialize rewarded ad:', error);
      }
    }
  }

  /**
   * Check if a rewarded video ad is loaded and ready
   */
  get isReady(): boolean {
    return this.isLoaded && Boolean(this.rewarded);
  }

  /**
   * Show rewarded video ad and execute callback on success
   */
  async showRewardAd(onRewardEarned: () => void): Promise<boolean> {
    if (!isAdMobNativeModuleAvailable() || !AdManager.canShowAds()) {
      // In dev / fallback mode, unlock directly for user convenience
      onRewardEarned();
      return true;
    }

    if (!this.isLoaded || !this.rewarded) {
      this.preload();
      // If ad is not loaded yet, fallback to grant reward so user experience isn't blocked
      onRewardEarned();
      return false;
    }

    try {
      const mobileAdsModule = require('react-native-google-mobile-ads');
      const { RewardedAdEventType } = mobileAdsModule;

      let rewardEarned = false;

      const rewardUnsubscribe = this.rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewardEarned = true;
        }
      );

      const closeUnsubscribe = this.rewarded.addAdEventListener('closed', () => {
        if (rewardEarned) {
          onRewardEarned();
        }
        rewardUnsubscribe();
        closeUnsubscribe();
      });

      await this.rewarded.show();
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[AdRewarded] Failed to show rewarded ad:', error);
      }
      onRewardEarned();
      return false;
    }
  }
}

export const AdRewarded = new AdRewardedManager();
