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
import { SoundKey } from '@/lib/store/focus.store';

interface SoundPickerProps {
  activeSound: SoundKey | null;
  onSelect: (key: SoundKey | null) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
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
      height: withTiming(activeSound ? 48 : 0, { duration: 300 }),
      marginTop: withTiming(activeSound ? 16 : 0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  const startVolumeRef = useRef(0);

  // Calculate volume percentage and trigger callback
  const handleTouch = (locationX: number) => {
    if (sliderWidth <= 0) return;
    const newVolume = Math.max(0, Math.min(1, locationX / sliderWidth));
    onVolumeChange(newVolume);
  };

  // Setup pan responder with child elements pointerEvents="none" for steady coordinates relative to track container
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        if (sliderWidth <= 0) return;
        const initialVolume = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidth));
        startVolumeRef.current = initialVolume;
        onVolumeChange(initialVolume);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (sliderWidth <= 0) return;
        const deltaVolume = gestureState.dx / sliderWidth;
        const newVolume = Math.max(0, Math.min(1, startVolumeRef.current + deltaVolume));
        onVolumeChange(newVolume);
      },
    })
  ).current;

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

      {/* Volume Slider overlay with animation */}
      <Animated.View style={[styles.sliderRow, animatedSliderStyle]}>
        <TouchableOpacity
          onPress={() => onVolumeChange(Math.max(0, volume - 0.1))}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.volumeEmoji}>🔈</Text>
        </TouchableOpacity>

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

          {/* Slider Custom Rounded Thumb */}
          <View
            style={[
              styles.sliderThumb,
              { left: volume * sliderWidth - 8 },
            ]}
            pointerEvents="none"
          />
        </View>

        <TouchableOpacity
          onPress={() => onVolumeChange(Math.min(1, volume + 0.1))}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.volumeEmoji}>🔊</Text>
        </TouchableOpacity>
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
  volumeEmoji: {
    fontSize: 12,
    color: '#9B9BAF',
    marginHorizontal: 8,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#5B4FE8',
  },
  sliderThumb: {
    position: 'absolute',
    top: 8, // (32 - 16) / 2
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
