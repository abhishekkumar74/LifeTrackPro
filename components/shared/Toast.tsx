import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useUiStore } from '@/lib/store/ui.store';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useUiStore();
  const translateY = useSharedValue(150);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (toast?.visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });

      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(150, { duration: 250 });
    }
  }, [toast?.visible, hideToast]);

  if (!toast) return null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getTheme = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: '#E6F9F5',
          border: '#00B894',
          text: '#00B894',
        };
      case 'error':
        return {
          bg: '#FFF0F0',
          border: '#E85858',
          text: '#E85858',
        };
      case 'info':
      default:
        return {
          bg: '#17172A',
          border: 'rgba(255,255,255,0.1)',
          text: '#FFFFFF',
        };
    }
  };

  const theme = getTheme();

  return (
    <Animated.View style={[styles.container, { width: width - 40 }, animatedStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    zIndex: 9999,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
