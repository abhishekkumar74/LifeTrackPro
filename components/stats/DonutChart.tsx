import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedProps,
  SharedValue,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface SubjectSlice {
  subject: string;
  minutes: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data?: SubjectSlice[];
  totalMinutes: number;
  isLoading: boolean;
}

const radius = 50;
const circumference = 2 * Math.PI * radius; // ~314.16
const svgSize = 130;
const centerPos = svgSize / 2;

interface DonutSliceProps {
  slice: SubjectSlice & { offset: number };
  totalSlices: number;
  centerPos: number;
  radius: number;
  circumference: number;
  animatedMultiplier: SharedValue<number>;
}

const DonutSlice: React.FC<DonutSliceProps> = ({
  slice,
  totalSlices,
  centerPos,
  radius,
  circumference,
  animatedMultiplier,
}) => {
  const startOffset = -(slice.offset / 100) * circumference;

  const animatedProps = useAnimatedProps(() => {
    const scale = animatedMultiplier.value;
    const currentLength = (slice.percentage / 100) * circumference * scale;
    // 2 deg gap = (2 / 360) * 314.16 = 1.74px gap
    const gapLength = totalSlices > 1 ? 1.74 : 0;
    const drawLength = Math.max(0, currentLength - gapLength);

    return {
      strokeDasharray: `${drawLength} ${circumference}`,
    };
  });

  return (
    <AnimatedCircle
      cx={centerPos}
      cy={centerPos}
      r={radius}
      stroke={slice.color}
      strokeWidth={16}
      fill="transparent"
      strokeDashoffset={startOffset}
      animatedProps={animatedProps}
      rotation={-90}
      originX={centerPos}
      originY={centerPos}
    />
  );
};

export const DonutChart: React.FC<DonutChartProps> = ({
  data = [],
  totalMinutes,
  isLoading,
}) => {
  const animatedMultiplier = useSharedValue(0);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      animatedMultiplier.value = 0;
      animatedMultiplier.value = withTiming(1, { duration: 900 });
    }
  }, [isLoading, data]);

  // Pulsing loading state
  const pulseOpacity = useSharedValue(0.5);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatHours = (mins: number) => {
    return `${(mins / 60).toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <Animated.View style={[styles.container, skeletonStyle]}>
        <View style={styles.chartWrapper}>
          <Svg width={svgSize} height={svgSize}>
            <Circle
              cx={centerPos}
              cy={centerPos}
              r={radius}
              stroke="#E8E7E3"
              strokeWidth={16}
              fill="transparent"
            />
          </Svg>
        </View>
      </Animated.View>
    );
  }

  if (data.length === 0) {
    return null;
  }

  // Calculate cumulative percentages for offsets
  let cumulativePercent = 0;
  const slicesWithOffsets = data.map((slice) => {
    const offset = cumulativePercent;
    cumulativePercent += slice.percentage;
    return {
      ...slice,
      offset,
    };
  });

  const totalSlices = data.length;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={svgSize} height={svgSize}>
          {/* Rotate circles by -90 deg so donut starts at 12 o'clock */}
          {slicesWithOffsets.map((slice, index) => (
            <DonutSlice
              key={index}
              slice={slice}
              totalSlices={totalSlices}
              centerPos={centerPos}
              radius={radius}
              circumference={circumference}
              animatedMultiplier={animatedMultiplier}
            />
          ))}

          {/* Center Text */}
          <SvgText
            x={centerPos}
            y={centerPos + 2}
            textAnchor="middle"
            fill="#17172A"
            fontSize={17}
            fontFamily="DMMono"
            fontWeight="bold"
          >
            {formatHours(totalMinutes)}
          </SvgText>
          <SvgText
            x={centerPos}
            y={centerPos + 16}
            textAnchor="middle"
            fill="#9B9BAF"
            fontSize={10}
            fontFamily="DMSans"
          >
            this week
          </SvgText>
        </Svg>
      </View>

      {/* Legend - 2 Column Grid */}
      <View style={styles.legendGrid}>
        {data.map((slice, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendSubject}>{slice.subject}</Text>
            <Text style={styles.legendPercent}>{slice.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 14,
  },
  chartWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: svgSize,
    height: svgSize,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 16,
    rowGap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendSubject: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#5C5C70',
    flex: 1,
  },
  legendPercent: {
    fontFamily: 'DMMono',
    fontSize: 12,
    color: '#17172A',
    fontWeight: '600',
    marginLeft: 6,
  },
});
export default DonutChart;
