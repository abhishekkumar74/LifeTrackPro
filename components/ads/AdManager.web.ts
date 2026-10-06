class AdManagerClass {
  async initialize(): Promise<boolean> {
    return false;
  }

  setFocusSessionActive(_active: boolean) {}

  canShowAds(): boolean {
    return false;
  }

  get isTestMode(): boolean {
    return false;
  }

  get isNativeModuleAvailable(): boolean {
    return false;
  }
}

export const AdManager = new AdManagerClass();
