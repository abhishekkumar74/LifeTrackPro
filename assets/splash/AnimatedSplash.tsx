import * as React from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

/**
 * LifeTrack Pro animated splash: letters rise, the indigo dot drops onto the i
 * and bounces, a ripple ring pulses, then the tagline fades in. ~2.4 s.
 * Uses only core Animated (native driver) + react-native-svg.
 * Usage: render while fonts/data load, call onFinish when ready to show the app.
 */
const NAVY = '#0F172A', INDIGO = '#5B5CF0', MUTED = '#94A3B8';
const VB_W = 356.45, VB_H = 444.09;
const DOT = { x: 259.85, y: 96.60, r: 80.15 };

type Props = { logoWidth?: number; tagline?: string; onFinish?: () => void };

export default function AnimatedSplash({ logoWidth = 220, tagline = 'Focus  •  Routines  •  Growth', onFinish }: Props) {
  const w = logoWidth, h = (logoWidth * VB_H) / VB_W, k = w / VB_W;
  const dotD = DOT.r * 2 * k, dotX = DOT.x * k - DOT.r * k, dotY = DOT.y * k - DOT.r * k;

  const letters = React.useRef(new Animated.Value(0)).current;
  const drop = React.useRef(new Animated.Value(0)).current;
  const ripple = React.useRef(new Animated.Value(0)).current;
  const tag = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(letters, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(drop, { toValue: 1, duration: 800, easing: Easing.bounce, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(ripple, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1250),
        Animated.timing(tag, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
    const t = setTimeout(() => onFinish?.(), 2400);
    return () => clearTimeout(t);
  }, []);

  const fall = -(dotY + dotD + 400);                         // starts above the screen
  return (
    <View style={styles.root}>
      <View style={{ width: w, height: h }}>
        <Animated.View style={{ opacity: letters, transform: [{ translateY: letters.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
            <G transform="translate(-16.35 427.64)">
              <Path d="M32.8 0V-292H98.4V-57.6H212.8V0Z" fill="#FFFFFF"/><Path d="M258.8 0V-172H229.6V-219.2H322.8V0Z" fill="#FFFFFF"/>
            </G>
          </Svg>
        </Animated.View>

        {/* ripple ring */}
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: dotX, top: dotY, width: dotD, height: dotD, borderRadius: dotD / 2,
          borderWidth: 3, borderColor: INDIGO,
          opacity: ripple.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 3.6] }) }],
        }} />

        {/* the dot */}
        <Animated.View style={{
          position: 'absolute', left: dotX, top: dotY, width: dotD, height: dotD,
          opacity: drop.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [fall, 0] }) }],
        }}>
          <Svg width={dotD} height={dotD} viewBox="0 0 2 2"><Circle cx="1" cy="1" r="1" fill={INDIGO} /></Svg>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.tag, { opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{tagline}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: 64, color: MUTED, fontSize: 13, letterSpacing: 1.2 },
});
