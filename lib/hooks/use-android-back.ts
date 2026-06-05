import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';

export function useAndroidBackHandler() {
  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, []);
}
