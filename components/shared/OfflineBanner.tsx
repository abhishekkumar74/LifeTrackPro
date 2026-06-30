import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'idle' | 'offline' | 'online'>('idle');
  const translateY = useSharedValue(150); // Start hidden off-screen below
  
  const wasOfflineRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // NetInfo state can be null initially, we treat null as connected
      const isConnected = state.isConnected !== false;
      
      if (!isConnected) {
        // Clear any pending hide timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        wasOfflineRef.current = true;
        setStatus('offline');
        translateY.value = withTiming(0, { duration: 400 });

        // Auto-hide offline banner after 3.5 seconds
        timeoutRef.current = setTimeout(() => {
          translateY.value = withTiming(150, { duration: 400 });
        }, 3500);

      } else if (isConnected && wasOfflineRef.current) {
        // Clear any pending hide timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        wasOfflineRef.current = false;
        setStatus('online');
        translateY.value = withTiming(0, { duration: 400 });

        // Auto-hide online banner after 3.5 seconds
        timeoutRef.current = setTimeout(() => {
          translateY.value = withTiming(150, { duration: 400 });
          // Reset status back to idle after animation finishes
          setTimeout(() => setStatus('idle'), 400);
        }, 3500);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Position it safely above the bottom tab bar
    const bottomOffset = insets.bottom > 0 ? insets.bottom + 65 : 75;
    return {
      transform: [{ translateY: translateY.value }],
      bottom: bottomOffset,
    };
  });

  if (status === 'idle') return null;

  const isGreen = status === 'online';

  return (
    <Animated.View style={[
      styles.container, 
      isGreen ? styles.onlineContainer : styles.offlineContainer, 
      animatedStyle
    ]}>
      <Text style={[styles.text, isGreen ? styles.onlineText : styles.offlineText]}>
        {isGreen ? '⚡ Back Online | Syncing data...' : '📶 Offline Mode | Using cached data'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill shaped design
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  offlineContainer: {
    backgroundColor: '#F59E0B', // Premium Amber Yellow
  },
  onlineContainer: {
    backgroundColor: '#10B981', // Emerald Green
  },
  text: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  offlineText: {
    color: '#0F172A', // Dark Slate for yellow readability
  },
  onlineText: {
    color: '#FFFFFF', // White text for green high-contrast readability
  },
});
