class AdInterstitialManager {
  preload() {}

  async showAtTransitionPoint(_reason: string = 'general'): Promise<boolean> {
    return false;
  }
}

export const AdInterstitial = new AdInterstitialManager();
