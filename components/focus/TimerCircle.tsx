import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Coffee, Sprout, Leaf, Sparkles, AlertTriangle, Flame } from 'lucide-react-native';
import { useFocusStore } from '@/lib/store/focus.store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerCircleProps {
  size?: number;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  currentMode: 'focus' | 'short_break' | 'long_break';
}

const THEME_COLORS = {
  default: '#5B4FE8',
  gold: '#E8A020',
  rose_gold: '#FDA4AF',
  sunset: '#FF5E62',
  mint: '#00B894',
  nebula: '#D946EF',
  obsidian: '#E2E8F0',
} as const;

export const TimerCircle: React.FC<TimerCircleProps> = ({
  size = 220,
  secondsLeft,
  totalSeconds,
  currentMode,
}) => {
  const {
    pomodoroCount,
    activeTheme = 'default',
    isStrictModeActive,
    isPlantWilted,
  } = useFocusStore();
  const themeColor = THEME_COLORS[activeTheme as keyof typeof THEME_COLORS] || '#5B4FE8';

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate current progress (value from 0 to 1)
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const renderBadgeIcon = () => {
    if (currentMode !== 'focus') return <Coffee size={13} color="#A78BFA" />;
    if (isPlantWilted && isStrictModeActive) return <AlertTriangle size={13} color="#EF4444" />;
    if (progress < 0.33) return <Sprout size={13} color="#10B981" />;
    if (progress < 0.66) return <Leaf size={13} color="#10B981" />;
    return <Sparkles size={13} color="#E8A020" />;
  };

  const getPlantStageLabel = () => {
    if (currentMode !== 'focus') return 'Rest Time';
    if (isPlantWilted && isStrictModeActive) return 'Wilted';
    if (progress < 0.33) return 'Seedling';
    if (progress < 0.66) return 'Sprouting';
    return 'Bloomed!';
  };

  // Reanimated shared value for smooth animation transitions
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.linear,
    });
  }, [progress]);

  // SVG Animated stroke offset
  const animatedProps = useAnimatedProps(() => {
    const strokeOffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset: strokeOffset,
    };
  });

  // Calculate time display string
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Mode label display mappings
  const getModeLabel = () => {
    switch (currentMode) {
      case 'focus':
        return 'Deep Focus';
      case 'short_break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
      default:
        return 'Deep Focus';
    }
  };

  // Color mapping helper for Pomodoro progress dots
  const getDotColor = (index: number) => {
    if (currentMode === 'long_break') {
      return themeColor; // All done on long break
    }
    const activeIndex = pomodoroCount % 4;
    if (index < activeIndex) {
      return themeColor; // Complete
    }
    if (index === activeIndex && currentMode === 'focus') {
      return '#FFFFFF'; // Active focus cycle
    }
    return 'rgba(255,255,255,0.15)'; // Pending
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Progress Circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={themeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Centered overlays */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.innerContent}>
          {/* Seed Growth Badge */}
          <View style={styles.seedBadge}>
            {renderBadgeIcon()}
            <Text style={styles.seedStageText}>{getPlantStageLabel()}</Text>
          </View>

          {/* Time Display */}
          <Text
            style={[styles.timeText, { fontSize: timeStr.length > 5 ? 32 : 40 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {timeStr}
          </Text>

          {/* Mode Label */}
          <Text style={styles.modeText}>{getModeLabel()}</Text>

          {/* Pomodoro Dot Indicators */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: getDotColor(i) },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  innerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  seedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  seedEmoji: {
    fontSize: 14,
  },
  seedStageText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '600',
  },
  timeText: {
    fontFamily: 'DMMono',
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -1,
    width: '85%',
    textAlign: 'center',
  },
  modeText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
