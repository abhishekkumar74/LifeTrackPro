import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  const isIOS = Platform.OS === 'ios';
  const hiddenValue = isIOS ? 100 : -100;
  const translateY = useSharedValue(hiddenValue);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);
      translateY.value = withTiming(offline ? 0 : hiddenValue, { duration: 300 });
    });

    return () => unsubscribe();
  }, [hiddenValue]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isIOS) {
      return {
        transform: [{ translateY: translateY.value }],
        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12,
      };
    } else {
      return {
        transform: [{ translateY: translateY.value }],
        paddingTop: insets.top + 8,
      };
    }
  });

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, isIOS ? styles.bottomContainer : styles.topContainer, animatedStyle]}>
      <Text style={styles.text}>⚠️ You are currently offline. Operating in local mode.</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#E8A020',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  topContainer: {
    top: 0,
    paddingBottom: 8,
  },
  bottomContainer: {
    bottom: 0,
    paddingTop: 12,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
