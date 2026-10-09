import { Platform } from 'react-native';
import { getAdUnitId, isAdMobNativeModuleAvailable } from '@/lib/config/ads';
import { AdManager } from './AdManager';

class AdRewardedManager {
  private rewarded: any = null;
  private isLoaded = false;
  private isLoading = false;

  constructor() {
    // Lazily preloaded on demand when AdManager is initialized
  }

  /**
   * Preload rewarded video ad safely
   */
  preload() {
    if (Platform.OS === 'web' || !isAdMobNativeModuleAvailable() || !AdManager.canShowAds()) return;
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
    if (Platform.OS === 'web' || !isAdMobNativeModuleAvailable() || !AdManager.canShowAds()) {
      // Dev / fallback mode
      onRewardEarned();
      return true;
    }

    // Function to present an already loaded ad
    const presentLoadedAd = async (): Promise<boolean> => {
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
          console.warn('[AdRewarded] Failed to present rewarded ad:', error);
        }
        onRewardEarned();
        return false;
      }
    };

    // Case 1: Ad is already loaded and ready
    if (this.isLoaded && this.rewarded) {
      return presentLoadedAd();
    }

    // Case 2: Ad not loaded yet. Preload and wait up to 4.5 seconds for load event
    this.preload();

    return new Promise<boolean>((resolve) => {
      let isSettled = false;

      const finishWithFallback = () => {
        if (isSettled) return;
        isSettled = true;
        onRewardEarned();
        resolve(false);
      };

      const timer = setTimeout(() => {
        finishWithFallback();
      }, 4500);

      const checkInterval = setInterval(async () => {
        if (this.isLoaded && this.rewarded && !isSettled) {
          isSettled = true;
          clearInterval(checkInterval);
          clearTimeout(timer);
          const success = await presentLoadedAd();
          resolve(success);
        }
      }, 300);
    });
  }
}

export const AdRewarded = new AdRewardedManager();
