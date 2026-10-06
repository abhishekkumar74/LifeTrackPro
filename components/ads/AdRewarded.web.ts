class AdRewardedManager {
  preload() {}

  get isReady(): boolean {
    return false;
  }

  async showRewardAd(onRewardEarned: () => void): Promise<boolean> {
    onRewardEarned();
    return true;
  }
}

export const AdRewarded = new AdRewardedManager();
