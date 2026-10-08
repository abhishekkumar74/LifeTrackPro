import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';

interface AppLogoProps {
  size?: number;           // star mark size
  showWordmark?: boolean;  // show "LifeTrack Pro" text
  variant?: 'dark' | 'light' | 'violet';
}

const VIOLET = '#5B5CF0';
const TEAL   = '#14B8A6';
const NAVY   = '#0F172A';
const VIOLET_DIM = '#3B3BA8';

export function AppLogo({
  size = 40,
  showWordmark = false,
  variant = 'dark',
}: AppLogoProps) {
  const s  = size;
  const cx = s / 2;
  const cy = s * 0.47;

  // spike proportions
  const topY    = cy - s * 0.32;
  const botY    = cy + s * 0.32 * 0.60;
  const rX      = cx + s * 0.32 * 0.60;
  const lX      = cx - s * 0.32 * 0.60;
  const hw      = s * 0.032;   // half-width of spike base
  const ol      = s * 0.042;   // overlap past center
  const jr      = Math.max(2, s * 0.085); // jewel radius
  const wr      = Math.max(1, jr * 0.45); // white inner

  const strokeColor = variant === 'violet' ? '#fff' : VIOLET;
  const dimColor    = variant === 'violet' ? 'rgba(255,255,255,0.5)' : VIOLET_DIM;

  return (
    <View style={styles.container}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Top spike */}
        <Polygon
          points={`${cx},${topY} ${cx+hw},${cy-ol} ${cx},${cy+s*0.04} ${cx-hw},${cy-ol}`}
          fill={strokeColor}
        />
        {/* Bottom spike */}
        <Polygon
          points={`${cx},${botY} ${cx+hw},${cy+ol} ${cx},${cy-s*0.03} ${cx-hw},${cy+ol}`}
          fill={dimColor}
        />
        {/* Right spike */}
        <Polygon
          points={`${rX},${cy} ${cx+ol},${cy-hw} ${cx-s*0.03},${cy} ${cx+ol},${cy+hw}`}
          fill={strokeColor}
          opacity={0.82}
        />
        {/* Left spike */}
        <Polygon
          points={`${lX},${cy} ${cx-ol},${cy+hw} ${cx+s*0.03},${cy} ${cx-ol},${cy-hw}`}
          fill={dimColor}
          opacity={0.85}
        />
        {/* Teal jewel */}
        <Circle cx={cx} cy={cy} r={jr} fill={TEAL} />
        {/* White inner */}
        <Circle cx={cx} cy={cy} r={wr} fill="#fff" opacity={0.9} />
      </Svg>

      {showWordmark && (
        <View style={styles.wordmark}>
          <Text style={[
            styles.wordmarkText,
            variant === 'light' && styles.wordmarkTextDark
          ]}>
            <Text>Life</Text>
            <Text style={styles.wordmarkAccent}>Track</Text>
          </Text>
          <Text style={styles.pro}>PRO</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    flexDirection: 'column',
    gap: 1,
  },
  wordmarkText: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wordmarkTextDark: {
    color: '#0F172A',
  },
  wordmarkAccent: {
    color: '#5B5CF0',
  },
  pro: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#7070A8',
  },
});
