import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useFocusStore } from '@/lib/store/focus.store';

interface TimerCircleProps {
  size?: number;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  currentMode: 'focus' | 'short_break' | 'long_break';
  accentColorOverride?: string;
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
  accentColorOverride,
  isNightMode = false,
}) => {
  const activeTheme = useFocusStore((state) => state.activeTheme || 'default');
  const isPaused = useFocusStore((state) => state.isPaused);
  const accentColor = accentColorOverride || THEME_ACCENTS[activeTheme as keyof typeof THEME_ACCENTS] || '#5B4FE8';

  const center = size / 2;
  const outerRadius = (size - 32) / 2; // radius for outermost tick tips
  const pieRadius = outerRadius - 9;
  const pieCircumference = 2 * Math.PI * pieRadius;

  // Fraction remaining (1.0 = full, 0.0 = depleted)
  const fractionRemaining = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 1;
  const activeTicksCount = Math.ceil(fractionRemaining * 60);

  // Pie chart stroke offset: starts at 12 o'clock (-90deg) and depletes clockwise as time decreases
  const pieStrokeOffset = pieCircumference * (1 - fractionRemaining);

  // Dynamic fade based on remaining time ("jitna kam hoga use sath wo bhi fade hote jayega"):
  // At 100% time: 1.0 (vibrant, rich); at 0% time: gracefully fades down to 0.35
  const dynamicFade = Math.max(0.35, 0.25 + 0.75 * fractionRemaining);
  const activePieColor = hexToRgba(accentColor, dynamicFade);
  const pieTrackColor = hexToRgba(accentColor, isNightMode ? 0.09 : 0.06);

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

  // Continuous smooth sweeping second needle (like an analog clock second hand)
  const sweepAngle = useSharedValue(0);

  React.useEffect(() => {
    if (isRunning && !isPaused) {
      // Synchronize angle with elapsed seconds in the current minute (6 deg per second)
      const elapsedInMin = (totalSeconds - secondsLeft) % 60;
      const startAngle = elapsedInMin * 6;
      sweepAngle.value = startAngle;

      // Continuously sweep 360 degrees over 60,000ms with smooth linear motion
      sweepAngle.value = withRepeat(
        withTiming(startAngle + 360, {
          duration: 60000,
          easing: Easing.linear,
        }),
        -1, // infinite loop
        false
      );
    } else if (isPaused) {
      cancelAnimation(sweepAngle);
    } else {
      cancelAnimation(sweepAngle);
      sweepAngle.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  }, [isRunning, isPaused, totalSeconds]);

  const animatedSecondHandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweepAngle.value}deg` }],
  }));

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

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Main Dial Face Gradient with subtle indigo-obsidian or crimson-obsidian tint */}
          <RadialGradient id="dialGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={isNightMode ? '#220406' : '#1E1C2C'} stopOpacity="0.98" />
            <Stop offset="70%" stopColor={isNightMode ? '#130204' : '#141320'} stopOpacity="0.99" />
            <Stop offset="100%" stopColor={isNightMode ? '#070001' : '#0C0B12'} stopOpacity="1" />
          </RadialGradient>

          {/* Ambient Inner Aura in App / Night Color */}
          <RadialGradient id="innerAura" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={0.06 + 0.20 * dynamicFade} />
            <Stop offset="65%" stopColor={accentColor} stopOpacity={0.02 + 0.06 * dynamicFade} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Dial Background Face */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 14}
          fill="url(#dialGrad)"
        />

        {/* App Color Inner Ambient Glow Aura */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius - 22}
          fill="url(#innerAura)"
        />

        {/* Outer Liquid Glass Bezel Ring 1 (Highlight) */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 14}
          stroke="rgba(255, 255, 255, 0.09)"
          strokeWidth={1.5}
          fill="transparent"
        />

        {/* Outer Liquid Glass Bezel Ring 2 (Beveled App Accent) */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 8}
          stroke={hexToRgba(accentColor, 0.20)}
          strokeWidth={2.5}
          fill="transparent"
        />

        {/* Inner Dial Track Boundary */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius - 18}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={1}
          fill="transparent"
        />

        {/* Pie Chart Donut Track (Subtle Faded Background Ring) */}
        <Circle
          cx={center}
          cy={center}
          r={pieRadius}
          stroke={pieTrackColor}
          strokeWidth={13}
          fill="transparent"
        />

        {/* Pie Chart Active Donut Arc (Depletes and Fades in Unison with Time) */}
        <Circle
          cx={center}
          cy={center}
          r={pieRadius}
          stroke={activePieColor}
          strokeWidth={13}
          strokeDasharray={pieCircumference}
          strokeDashoffset={pieStrokeOffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* 60 Radial Chronometer Ticks */}
        {ticks.map((tick) => {
          // If timer is stopped (at initial state), all ticks are lit in the faded remaining color.
          // When running or paused, ticks up to activeTicksCount are illuminated in faded remaining color,
          // and ticks beyond are extra faded in the other (elapsed) color.
          const isTickRemaining = !isRunning && !isPaused && secondsLeft === totalSeconds
            ? true
            : tick.index < activeTicksCount;

          const isLeadingTick = isRunning && tick.index === activeTicksCount - 1;

          let strokeColor: string;
          let strokeWidth: number;

          if (isLeadingTick) {
            // Bright highlight tick for the active leading edge
            strokeColor = isNightMode ? '#FFD4D0' : '#FFFFFF';
            strokeWidth = tick.isMajor ? 3.6 : 2.6;
          } else if (isTickRemaining) {
            // Faded color in remaining time (app color with luminous presence fading with time)
            strokeColor = hexToRgba(accentColor, Math.max(0.40, (tick.isMajor ? 0.95 : 0.70) * dynamicFade));
            strokeWidth = tick.isMajor ? 2.8 : 1.7;
          } else {
            // Some extra faded color in the other time (elapsed time)
            strokeColor = hexToRgba(accentColor, tick.isMajor ? 0.14 : 0.06);
            strokeWidth = tick.isMajor ? 2.0 : 1.2;
          }

          return (
            <React.Fragment key={tick.index}>
              <Line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {isLeadingTick && (
                <Circle
                  cx={tick.x1}
                  cy={tick.y1}
                  r={2.5}
                  fill={isNightMode ? '#FFD4D0' : '#FFFFFF'}
                />
              )}
            </React.Fragment>
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
          fill="#FFFFFF"
        />
      </Svg>

      {/* Sweeping Clock Second Needle (Continuously and smoothly moves like an analog clock) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          animatedSecondHandStyle,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Needle Counterweight Tail */}
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center + 18}
            stroke={isNightMode ? '#FF3B30' : hexToRgba(accentColor, 0.85)}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          {/* Main Sweeping Needle Shaft */}
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center - outerRadius + 6}
            stroke={isNightMode ? '#FF5E55' : '#FFFFFF'}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          {/* Outer Pip Halo Ring on Outer Tick Track */}
          <Circle
            cx={center}
            cy={center - outerRadius + 6}
            r={5.5}
            fill="transparent"
            stroke={accentColor}
            strokeWidth={1.5}
          />
          {/* Glowing Luminous Pip on Needle Tip */}
          <Circle
            cx={center}
            cy={center - outerRadius + 6}
            r={3}
            fill="#FFFFFF"
          />
          {/* Center Pivot Jewel Cap */}
          <Circle
            cx={center}
            cy={center}
            r={5}
            fill={accentColor}
          />
          <Circle
            cx={center}
            cy={center}
            r={2.2}
            fill="#FFFFFF"
          />
        </Svg>
      </Animated.View>

      {/* Center Readout Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.centerReadout}>
          {/* Main Large Digital Display */}
          <Text
            style={[
              styles.timeDigits,
              { fontSize: size < 290 ? 46 : size < 330 ? 56 : 64 },
              isNightMode && { color: '#FFA09B' },
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
