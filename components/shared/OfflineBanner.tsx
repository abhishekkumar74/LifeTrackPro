import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [bannerState, setBannerState] = useState<{
    type: 'offline' | 'online';
    text: string;
  }>({ type: 'offline', text: '📶 Offline Mode | Using cached data' });

  const translateY = useSharedValue(150); // Start hidden off-screen below
  const timeoutRef = React.useRef<any>(null);

  useEffect(() => {
    const showBanner = (type: 'offline' | 'online') => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const text = type === 'offline'
        ? '📶 Offline Mode | Using cached data'
        : '🟢 Back Online | Connected';

      setBannerState({ type, text });
      translateY.value = withTiming(0, { duration: 400 });

      // Automatically slide out after 3 seconds
      timeoutRef.current = setTimeout(() => {
        translateY.value = withTiming(150, { duration: 400 });
      }, 3000);
    };

    let prevConnected: boolean | null = null;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? true;

      if (prevConnected === null) {
        // Initial setup: only show offline banner if starting offline
        if (!isConnected) {
          showBanner('offline');
        }
        prevConnected = isConnected;
        return;
      }

      if (prevConnected && !isConnected) {
        // Transition: Online -> Offline
        showBanner('offline');
      } else if (!prevConnected && isConnected) {
        // Transition: Offline -> Online
        showBanner('online');
      }

      prevConnected = isConnected;
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      bottom: insets.bottom > 0 ? insets.bottom + 8 : 12,
    };
  });

  const containerBgColor = bannerState.type === 'offline' ? '#F59E0B' : '#10B981';
  const textColor = bannerState.type === 'offline' ? '#0F172A' : '#FFFFFF';

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { backgroundColor: containerBgColor },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{bannerState.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill shaped design
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  text: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
