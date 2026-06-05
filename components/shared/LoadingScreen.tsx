import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';

export const LoadingScreen: React.FC = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulse animation for the loader background
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 })
      ),
      -1, // infinite loop
      true // reverse
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.circlePulse, animatedCircleStyle]}>
          <ActivityIndicator size="large" color={COLORS.violet} style={styles.indicator} />
        </Animated.View>
        <Animated.View style={animatedTextStyle}>
          <Text style={styles.text}>{STRINGS.common.loading}</Text>
          <Text style={styles.brandText}>{STRINGS.common.appName}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  circlePulse: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  indicator: {
    transform: [{ scale: 1.2 }],
  },
  text: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.t2,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  brandText: {
    fontFamily: TYPOGRAPHY.fonts.display,
    fontSize: TYPOGRAPHY.sizes.xxl,
    color: COLORS.navy,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default LoadingScreen;
