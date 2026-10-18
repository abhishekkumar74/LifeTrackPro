import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

export interface AppLogoProps {
  size?: number;           // logo mark height
  showWordmark?: boolean;  // show "LifeTrack Pro" text
  variant?: 'dark' | 'light' | 'violet';
  color?: string;
  accent?: string;
}

const INDIGO = '#5B5CF0';
const NAVY   = '#0F172A';
const WHITE  = '#FFFFFF';

export function AppLogo({
  size = 40,
  showWordmark = false,
  variant = 'dark',
  color,
  accent,
}: AppLogoProps) {
  let effectiveColor = color;
  let effectiveAccent = accent;

  if (!effectiveColor) {
    if (variant === 'light') {
      effectiveColor = NAVY;
    } else {
      effectiveColor = WHITE;
    }
  }

  if (!effectiveAccent) {
    if (variant === 'violet') {
      effectiveAccent = WHITE;
    } else {
      effectiveAccent = INDIGO;
    }
  }

  // Aspect ratio of the Spark i mark: 356.45 / 444.09
  const width = size * (356.45 / 444.09);

  return (
    <View style={styles.container}>
      <Svg width={width} height={size} viewBox="0 0 356.45 444.09">
        <G transform="translate(-16.35 427.64)">
          <Path d="M32.8 0V-292H98.4V-57.6H212.8V0Z" fill={effectiveColor} />
          <Path d="M258.8 0V-172H229.6V-219.2H322.8V0Z" fill={effectiveColor} />
          <Circle cx="276.20" cy="-331.04" r="80.15" fill={effectiveAccent} />
        </G>
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

export default AppLogo;

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
