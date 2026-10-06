import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { getAdUnitId, isTestAdEnabled, isAdMobNativeModuleAvailable } from '@/lib/config/ads';
import { AdManager } from './AdManager';

interface AdBannerProps {
  size?: any;
  style?: ViewStyle;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  size,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If web, or ads suppressed, or failed to load, render nothing
  if (Platform.OS === 'web' || !AdManager.canShowAds() || hasError) {
    return null;
  }

  let BannerAd: any = null;
  let BannerAdSize: any = null;

  try {
    const mobileAdsModule = require('react-native-google-mobile-ads');
    BannerAd = mobileAdsModule.BannerAd;
    BannerAdSize = mobileAdsModule.BannerAdSize;
  } catch (e) {
    return null;
  }

  if (!BannerAd) return null;

  const adSize = size || (BannerAdSize ? BannerAdSize.ANCHORED_ADAPTIVE_BANNER : 'ANCHORED_ADAPTIVE_BANNER');
  const unitId = getAdUnitId('banner');

  return (
    <View style={[styles.container, style]}>
      {isTestAdEnabled && isLoaded && (
        <View style={styles.testBadge}>
          <Text style={styles.testBadgeText}>TEST AD</Text>
        </View>
      )}

      <BannerAd
        unitId={unitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          setIsLoaded(true);
          setHasError(false);
          if (__DEV__) {
            console.log('[AdBanner] Banner ad loaded successfully.');
          }
        }}
        onAdFailedToLoad={(error: any) => {
          setHasError(true);
          setIsLoaded(false);
          if (__DEV__) {
            console.warn('[AdBanner] Banner failed to load silently:', error?.message || error);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  testBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  testBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'DMMono',
    fontWeight: 'bold',
  },
});
