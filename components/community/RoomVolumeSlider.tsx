import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { VolumeX, Volume1, Volume2 } from 'lucide-react-native';

interface RoomVolumeSliderProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  trackHeight?: number;
  showPercentOnly?: boolean;
}

export const RoomVolumeSlider: React.FC<RoomVolumeSliderProps> = ({
  volume,
  onVolumeChange,
  style,
  accentColor = '#7C5CFC',
  trackHeight = 32,
  showPercentOnly = false,
}) => {
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  const sliderWidthRef = useRef(0);
  useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  const stateRef = useRef({
    volume,
    onVolumeChange,
    startVolume: volume,
  });

  useEffect(() => {
    stateRef.current.volume = volume;
    stateRef.current.onVolumeChange = onVolumeChange;
  }, [volume, onVolumeChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        const width = sliderWidthRef.current;
        if (width <= 0) return;
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
    })
  ).current;

  const renderVolumeIcon = () => {
    const iconColor = '#FFFFFF';
    if (volume <= 0.02) {
      return <VolumeX size={13} color={iconColor} />;
    } else if (volume < 0.45) {
      return <Volume1 size={13} color={iconColor} />;
    } else {
      return <Volume2 size={13} color={iconColor} />;
    }
  };

  const percentage = Math.round(volume * 100);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.sliderTrackContainer, { height: trackHeight }]}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {/* Slider Background Track */}
        <View
          style={[
            styles.sliderTrack,
            { height: trackHeight, borderRadius: trackHeight / 2 },
          ]}
          pointerEvents="none"
        >
          {/* Slider Filled Progress */}
          <View
            style={[
              styles.sliderFill,
              {
                width: `${percentage}%`,
                backgroundColor: accentColor,
                borderRadius: trackHeight / 2,
              },
            ]}
          />
        </View>

        {/* Floating UI Overlays inside track (transparent to touch) */}
        <View style={styles.overlayContainer} pointerEvents="none">
          <View style={styles.leftIconContainer}>{renderVolumeIcon()}</View>
          <Text style={styles.overlayText}>
            {showPercentOnly ? `${percentage}%` : `${percentage}% Volume`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  sliderTrackContainer: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
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
    opacity: 0.95,
  },
  overlayText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
