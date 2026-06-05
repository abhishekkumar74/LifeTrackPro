import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Shield } from 'lucide-react-native';

interface BlockerToggleProps {
  isActive: boolean;
  onToggle: () => void;
  blockedCount: number;
}

export const BlockerToggle: React.FC<BlockerToggleProps> = ({
  isActive,
  onToggle,
  blockedCount,
}) => {
  const activeVal = useSharedValue(0);

  useEffect(() => {
    activeVal.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const handleTogglePress = () => {
    // 1. Trigger the state change
    onToggle();

    // 2. If it is being enabled, display platform instructions
    if (!isActive) {
      if (Platform.OS === 'android') {
        Alert.alert(
          'Enable App Blocker',
          'To block distracting apps, LifeTrack Pro requires Accessibility Service permissions. Enable it in settings to continue.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch((err) => {
                  if (__DEV__) console.error('Failed to open settings:', err);
                });
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else if (Platform.OS === 'ios') {
        Alert.alert(
          'iOS Screen Time Focus',
          'iOS limits direct app blocking. Enable Screen Time Focus in Settings to block distracting apps during study sessions.',
          [
            {
              text: 'Open Screen Time',
              onPress: () => {
                Linking.openURL('App-prefs:SCREEN_TIME').catch(() => {
                  // Fallback to settings if App-prefs URL scheme is not supported
                  Linking.openSettings().catch((err) => {
                    if (__DEV__) console.error('Failed to open settings:', err);
                  });
                });
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    }
  };

  const trackAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: activeVal.value > 0.5 ? '#00B894' : '#E85858',
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activeVal.value * 20 }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Shield Icon */}
      <View style={styles.iconContainer}>
        <Shield size={20} color="#FFFFFF" />
      </View>

      {/* Info Middle Section */}
      <View style={styles.middleContainer}>
        <Text style={styles.title}>App Blocker</Text>
        <Text style={styles.subtitle}>
          {isActive
            ? `Blocking ${blockedCount} apps`
            : 'Tap to block distracting apps'}
        </Text>
      </View>

      {/* Reanimated Animated Switch */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleTogglePress}
        style={styles.switchWrapper}
      >
        <Animated.View style={[styles.switchTrack, trackAnimatedStyle]}>
          <Animated.View style={[styles.switchThumb, thumbAnimatedStyle]} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  switchWrapper: {
    padding: 4,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
});
