import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useFocusStore } from '@/lib/store/focus.store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerCircleProps {
  size?: number;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  currentMode: 'focus' | 'short_break' | 'long_break';
  themeColorOverride?: string;
  isNightMode?: boolean;
}

export const THEME_ACCENTS = {
  default: '#5B4FE8', // LifeTrack Pro signature Electric Indigo
  gold: '#E8A020',
  rose_gold: '#FDA4AF',
  sunset: '#FF5E62',
  mint: '#00B894',
  nebula: '#D946EF',
  obsidian: '#94A3B8',
} as const;

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

interface TickData {
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isMajor: boolean;
}

export const TimerCircle = React.memo<TimerCircleProps>(({
  size = 320,
  secondsLeft,
  totalSeconds,
  isRunning,
  currentMode,
  themeColorOverride,
  isNightMode = false,
}) => {
  const activeTheme = useFocusStore((state) => state.activeTheme || 'default');
  const isPaused = useFocusStore((state) => state.isPaused);
  const baseAccent = THEME_ACCENTS[activeTheme as keyof typeof THEME_ACCENTS] || '#5B4FE8';
  const accentColor = themeColorOverride || (isNightMode ? '#FF3B30' : baseAccent);

  const center = size / 2;
  const outerRadius = (size - 32) / 2; // radius for outermost tick tips

  // Generate 60 radial ticks starting clockwise from 12 o'clock
  const ticks = useMemo<TickData[]>(() => {
    const list: TickData[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 * Math.PI) / 180;
      const isMajor = i % 5 === 0;
      const length = isMajor ? 16 : 9;
      const innerRadius = outerRadius - length;

      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      list.push({
        index: i,
        x1: center + outerRadius * sin,
        y1: center - outerRadius * cos,
        x2: center + innerRadius * sin,
        y2: center - innerRadius * cos,
        isMajor,
      });
    }
    return list;
  }, [center, outerRadius]);

  // Fraction of elapsed time (0 at start -> 1 at complete)
  const elapsedFraction = totalSeconds > 0
    ? Math.max(0, Math.min(1, (totalSeconds - secondsLeft) / totalSeconds))
    : 0;

  const trackRadius = outerRadius - 18;
  const sectorRadius = trackRadius / 2;
  const sectorStrokeWidth = trackRadius;
  const sectorCircumference = 2 * Math.PI * sectorRadius;

  // Shared value for smooth continuous linear progress
  const animatedProgress = useSharedValue(elapsedFraction);

  React.useEffect(() => {
    if (isRunning && !isPaused) {
      animatedProgress.value = withTiming(elapsedFraction, {
        duration: 1000,
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(animatedProgress);
      animatedProgress.value = withTiming(elapsedFraction, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [elapsedFraction, isRunning, isPaused, animatedProgress]);

  const animatedSectorProps = useAnimatedProps(() => {
    const strokeOffset = sectorCircumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset: strokeOffset,
    };
  });

  const animatedKnobStyle = useAnimatedStyle(() => {
    // Anticlockwise rotation from 12 o'clock
    const angleDeg = -animatedProgress.value * 360;
    return {
      transform: [{ rotate: `${angleDeg}deg` }],
    };
  });

  // Active ticks count based on progress
  const activeTicksCount = Math.round(elapsedFraction * 60);

  // Time display strings
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const modeLabel = useMemo(() => {
    if (isPaused) return 'PAUSED';
    if (currentMode === 'focus') return 'FOCUS';
    if (currentMode === 'short_break') return 'REST';
    if (currentMode === 'long_break') return 'RECHARGE';
    return 'FOCUS';
  }, [currentMode, isPaused]);

  // Subtle breathing animation for active running state
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (isRunning) {
      pulseOpacity.value = withRepeat(
        withTiming(0.68, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isRunning, pulseOpacity]);

  const animatedCenterGlow = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Position of 12 o'clock top indicator dot (below top major tick)
  const topDotY = center - (outerRadius - 26);
  const dialGradId = `dialGrad_${isNightMode ? 'night' : 'day'}_${accentColor.replace('#', '')}`;
  const auraGradId = `innerAura_${isNightMode ? 'night' : 'day'}_${accentColor.replace('#', '')}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Main Dial Face Gradient with subtle indigo-obsidian tint or StandBy deep night phosphor */}
          <RadialGradient id={dialGradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={isNightMode ? '#1C0407' : '#1E1C2C'} stopOpacity="0.98" />
            <Stop offset="70%" stopColor={isNightMode ? '#100103' : '#141320'} stopOpacity="0.99" />
            <Stop offset="100%" stopColor={isNightMode ? '#050002' : '#0C0B12'} stopOpacity="1" />
          </RadialGradient>

          {/* Ambient Inner Aura in App Color or Night Mode Crimson Red */}
          <RadialGradient id={auraGradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={isNightMode ? 0.35 : 0.22} />
            <Stop offset="65%" stopColor={accentColor} stopOpacity={isNightMode ? 0.10 : 0.05} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Dial Background Face */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 14}
          fill={`url(#${dialGradId})`}
        />

        {/* App Color Inner Ambient Glow Aura */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius - 22}
          fill={`url(#${auraGradId})`}
        />

        {/* Shaded Progress Sector (Anticlockwise Color Fade Wedge) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={sectorRadius}
          stroke={isNightMode ? 'rgba(255, 59, 48, 0.38)' : hexToRgba(accentColor, 0.35)}
          strokeWidth={sectorStrokeWidth}
          strokeDasharray={`${sectorCircumference} ${sectorCircumference}`}
          animatedProps={animatedSectorProps}
          strokeLinecap="butt"
          fill="transparent"
          transform={`translate(${2 * center} 0) scale(-1 1) rotate(-90 ${center} ${center})`}
        />

        {/* Outer Liquid Glass Bezel Ring 1 (Highlight) */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 14}
          stroke={isNightMode ? 'rgba(255, 59, 48, 0.22)' : 'rgba(255, 255, 255, 0.09)'}
          strokeWidth={1.5}
          fill="transparent"
        />

        {/* Outer Liquid Glass Bezel Ring 2 (Beveled App Accent) */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 8}
          stroke={hexToRgba(accentColor, isNightMode ? 0.35 : 0.20)}
          strokeWidth={2.5}
          fill="transparent"
        />

        {/* Inner Dial Track Boundary */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius - 18}
          stroke={isNightMode ? 'rgba(255, 59, 48, 0.18)' : 'rgba(255, 255, 255, 0.05)'}
          strokeWidth={1}
          fill="transparent"
        />

        {/* 60 Radial Chronometer Ticks */}
        {ticks.map((tick) => {
          // Resting state before start: clean uniform chronometer dial
          const isResting = !isRunning && !isPaused && secondsLeft === totalSeconds;

          // Anticlockwise swept ticks: tick 0 is 12 o'clock, ticks sweep: 59, 58, 57...
          const isTickSwept = !isResting && (tick.index === 0 || tick.index >= 60 - activeTicksCount);

          let strokeColor: string;
          let strokeWidth: number;

          if (isResting) {
            strokeColor = hexToRgba(accentColor, tick.isMajor ? 0.42 : 0.22);
            strokeWidth = tick.isMajor ? 2.4 : 1.4;
          } else if (isTickSwept) {
            // Illuminated ticks inside the swept color sector
            strokeColor = hexToRgba(accentColor, tick.isMajor ? 0.95 : 0.75);
            strokeWidth = tick.isMajor ? 2.8 : 1.7;
          } else {
            // Faded ticks in the remaining time (dark area)
            strokeColor = hexToRgba(accentColor, tick.isMajor ? 0.18 : 0.08);
            strokeWidth = tick.isMajor ? 2.0 : 1.2;
          }

          return (
            <Line
              key={tick.index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}

        {/* 12 o'clock Chronometer Pivot Indicator Dot */}
        <Circle
          cx={center}
          cy={topDotY}
          r={4}
          fill={accentColor}
        />
        <Circle
          cx={center}
          cy={topDotY}
          r={2}
          fill={isNightMode ? '#FF8880' : '#FFFFFF'}
        />
      </Svg>

      {/* Smooth Moving Leading Edge Radial Sweep & Outer Indicator Knob */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          animatedKnobStyle,
          { width: size, height: size },
        ]}
      >
        {(isRunning || isPaused || elapsedFraction > 0.005) && (
          <>
            {/* Radial Divider Line from inner aura out to tick track */}
            <View
              style={{
                position: 'absolute',
                left: center - 0.75,
                top: center - outerRadius + 18,
                width: 1.5,
                height: outerRadius - 18 - 30,
                backgroundColor: isNightMode ? 'rgba(255, 163, 158, 0.7)' : hexToRgba(accentColor, 0.55),
              }}
            />

            {/* Smooth Moving White Chronometer Line across the ticks */}
            <View
              style={{
                position: 'absolute',
                left: center - 1.2,
                top: center - outerRadius,
                width: 2.4,
                height: 18,
                backgroundColor: isNightMode ? '#FFA39E' : '#FFFFFF',
                borderRadius: 1.2,
                shadowColor: '#FFFFFF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 3,
                elevation: 4,
              }}
            />

            {/* Glowing Indicator Knob (Dot) at the OUTER CIRCLE */}
            <View
              style={{
                position: 'absolute',
                left: center - 5,
                top: center - outerRadius - 4,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: isNightMode ? '#FF3B30' : accentColor,
                borderWidth: 1.5,
                borderColor: isNightMode ? '#FFA39E' : '#FFFFFF',
                shadowColor: isNightMode ? '#FF3B30' : accentColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 6,
                elevation: 8,
              }}
            />
          </>
        )}
      </Animated.View>

      {/* Center Readout Overlay */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.centerReadout}>
          {/* Main Large Digital Display */}
          <Text
            style={[
              styles.timeDigits,
              isNightMode && { color: '#FF453A' },
              { fontSize: size < 290 ? 46 : size < 330 ? 56 : 64 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {timeStr}
          </Text>

          {/* Retro Mode Pill (e.g. • FOCUS) */}
          <Animated.View style={[styles.modeRow, animatedCenterGlow]}>
            <View style={[styles.modeIndicatorDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.modeText, { color: hexToRgba(accentColor, 0.95) }]}>
              {modeLabel}
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  centerReadout: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  timeDigits: {
    fontFamily: 'DMMono',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  modeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
});
