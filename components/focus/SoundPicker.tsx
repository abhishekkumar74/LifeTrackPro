import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Volume2, VolumeX, Volume1 } from 'lucide-react-native';
import { SoundKey } from '@/lib/store/focus.store';

interface SoundPickerProps {
  activeSound: SoundKey | null;
  onSelect: (key: SoundKey | null) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onScrollStateChange?: (enabled: boolean) => void;
}

interface ChipItem {
  key: SoundKey | null;
  label: string;
}

const SOUNDS: ChipItem[] = [
  { key: null, label: 'None' },
  { key: 'rain', label: '🌧 Rain' },
  { key: 'cafe', label: '☕ Café' },
  { key: 'ocean', label: '🌊 Ocean' },
  { key: 'lofi', label: '🎵 Lo-fi' },
  { key: 'brown_noise', label: '⬜ Noise' },
];

export const SoundPicker: React.FC<SoundPickerProps> = ({
  activeSound,
  onSelect,
  volume,
  onVolumeChange,
  onScrollStateChange,
}) => {
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  const opacity = useSharedValue(0);

  // Sync volume slider fade-in transition based on active sound selection
  useEffect(() => {
    opacity.value = withTiming(activeSound ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [activeSound]);

  const animatedSliderStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      height: withTiming(activeSound ? 36 : 0, { duration: 300 }),
      marginTop: withTiming(activeSound ? 12 : 0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  // Track layout width ref
  const sliderWidthRef = useRef(0);
  useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  // Use a state reference object to avoid closure issues in PanResponder callbacks
  const stateRef = useRef({
    volume,
    onVolumeChange,
    onScrollStateChange,
    startVolume: volume,
  });

  useEffect(() => {
    stateRef.current.volume = volume;
    stateRef.current.onVolumeChange = onVolumeChange;
    stateRef.current.onScrollStateChange = onScrollStateChange;
  }, [volume, onVolumeChange, onScrollStateChange]);

  // Setup pan responder with child elements pointerEvents="none" for steady coordinates relative to track container
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const width = sliderWidthRef.current;
        if (width <= 0) return;
        
        // Lock parent ScrollView from scrolling
        stateRef.current.onScrollStateChange?.(false);
        
        const initialVolume = Math.max(0, Math.min(1, evt.nativeEvent.locationX / width));
        stateRef.current.startVolume = initialVolume;
        stateRef.current.onVolumeChange(initialVolume);
      },
      onPanResponderMove: (evt, gestureState) => {
        const width = sliderWidthRef.current;
        if (width <= 0) return;
        
        const deltaVolume = gestureState.dx / width;
        const newVolume = Math.max(0, Math.min(1, stateRef.current.startVolume + deltaVolume));
        stateRef.current.onVolumeChange(newVolume);
      },
      onPanResponderRelease: () => {
        // Unlock parent ScrollView scrolling
        stateRef.current.onScrollStateChange?.(true);
      },
      onPanResponderTerminate: () => {
        // Unlock parent ScrollView scrolling
        stateRef.current.onScrollStateChange?.(true);
      },
    })
  ).current;

  // Determine volume icon based on level
  const renderVolumeIcon = () => {
    const iconColor = '#FFFFFF';
    if (volume === 0) {
      return <VolumeX size={12} color={iconColor} />;
    } else if (volume < 0.4) {
      return <Volume1 size={12} color={iconColor} />;
    } else {
      return <Volume2 size={12} color={iconColor} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={styles.headerLabel}>AMBIENT SOUND</Text>

      {/* Chips Horizontal Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {SOUNDS.map((sound) => {
          const active = activeSound === sound.key;
          return (
            <TouchableOpacity
              key={sound.key || 'none'}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(sound.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {sound.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* iOS Control Center styled Volume Slider overlay with animation */}
      <Animated.View style={[styles.sliderRow, animatedSliderStyle]}>
        <View
          style={styles.sliderTrackContainer}
          onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          {/* Slider Background Track */}
          <View style={styles.sliderTrack} pointerEvents="none">
            {/* Slider Filled Progress */}
            <View
              style={[
                styles.sliderFill,
                { width: `${volume * 100}%` },
              ]}
            />
          </View>

          {/* Floating UI Overlays inside track (fully transparent to touches) */}
          <View style={styles.overlayContainer} pointerEvents="none">
            <View style={styles.leftIconContainer}>
              {renderVolumeIcon()}
            </View>
            <Text style={styles.overlayText}>
              {Math.round(volume * 100)}% Volume
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  scrollContainer: {
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(91, 79, 232, 0.2)',
    borderColor: 'rgba(91, 79, 232, 0.4)',
  },
  chipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#A89EF8',
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrackContainer: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: 'rgba(91, 79, 232, 0.85)',
    borderRadius: 12,
  },
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  leftIconContainer: {
    opacity: 0.85,
  },
  overlayText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
});
