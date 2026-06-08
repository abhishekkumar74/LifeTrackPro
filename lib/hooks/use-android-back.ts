import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';

export function useAndroidBackHandler(onBackPressHandler?: () => boolean) {
  useEffect(() => {
    const onBackPress = () => {
      if (onBackPressHandler) {
        return onBackPressHandler();
      }
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
  }, [onBackPressHandler]);
}
