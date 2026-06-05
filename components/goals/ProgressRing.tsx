import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size: number;
  progress: number; // 0 to 1
  strokeWidth: number;
  color: string;
  showLabel: boolean;
  labelFontSize?: number;
  textColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size,
  progress,
  strokeWidth,
  color,
  showLabel,
  labelFontSize = 12,
  textColor = '#17172A',
}) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Reanimated shared value for tracking animated progress value
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  // Define animated props for the SVG progress circle
  const animatedProps = useAnimatedProps(() => {
    const strokeOffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset: strokeOffset,
    };
  });

  const percentage = Math.round(progress * 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E8E7E3"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Progress Arc Circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Centered Percentage Label */}
        {showLabel && (
          <SvgText
            x={center}
            y={center + labelFontSize / 3} // adjusts text vertical centering offset
            textAnchor="middle"
            fontSize={labelFontSize}
            fontFamily="DMMono"
            fontWeight="600"
            fill={textColor}
          >
            {`${percentage}%`}
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({});
