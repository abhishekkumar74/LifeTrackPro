import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export interface BarDay {
  dayLabel: string;
  date: string;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

interface BarChartProps {
  data?: BarDay[];
  isLoading: boolean;
}

const chartHeight = 80;
const maxMinutes = 480; // 8 hours max height scale
const barGap = 8;
const margin = 40;
const leftAxisWidth = 30;

export const BarChart: React.FC<BarChartProps> = ({ data = [], isLoading }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const availableWidth = screenWidth - margin - leftAxisWidth;
  const barWidth = (availableWidth - 6 * barGap) / 7;

  // Pulse animation for skeleton loading
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

  // Calculations
  const { avgY, avgMinutes } = React.useMemo(() => {
    if (!data || data.length === 0) return { avgY: 0, avgMinutes: 0 };
    const completedDays = data.filter((d) => !d.isFuture);
    const total = completedDays.reduce((sum, d) => sum + d.minutes, 0);
    const avg = completedDays.length > 0 ? total / completedDays.length : 0;
    
    // Scale avg to Y coordinates (0 is top, chartHeight is bottom)
    const scaledHeight = Math.min(chartHeight, (avg / maxMinutes) * chartHeight);
    const yVal = chartHeight - scaledHeight;
    return { avgY: yVal, avgMinutes: avg };
  }, [data]);

  const getBarColor = (item: BarDay) => {
    if (item.isToday) return '#5B4FE8'; // full violet
    if (item.isFuture || item.minutes === 0) return '#E8E7E3'; // grey
    return '#C7BFFE'; // past with data (light violet)
  };

  const formatHours = (mins: number) => {
    return `${(mins / 60).toFixed(1)}h`;
  };

  if (isLoading) {
    const skeletonHeights = [40, 20, 65, 10, 50, 30, 15];
    return (
      <Animated.View style={[styles.container, skeletonStyle]}>
        <View style={styles.chartWrapper}>
          <Svg width="100%" height={chartHeight + 20}>
            {/* Horizontal guidelines */}
            {[0, 20, 40, 60, 80].map((y, idx) => (
              <Line
                key={idx}
                x1={leftAxisWidth}
                y1={y}
                x2="100%"
                y2={y}
                stroke="#F2F1EE"
                strokeWidth={1}
              />
            ))}

            {/* Skeleton Bars */}
            {skeletonHeights.map((h, i) => {
              const xPos = leftAxisWidth + i * (barWidth + barGap);
              const yPos = chartHeight - h;
              return (
                <React.Fragment key={i}>
                  <Rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={h}
                    rx={4}
                    fill="#E8E7E3"
                  />
                  {h > 4 && (
                    <Rect
                      x={xPos}
                      y={yPos + h - 4}
                      width={barWidth}
                      height={4}
                      fill="#E8E7E3"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width="100%" height={chartHeight + 22}>
          {/* Y Axis Guide Lines & Labels */}
          {([
            { y: 80, label: '0' },
            { y: 60, label: '2h' },
            { y: 40, label: '4h' },
            { y: 20, label: '6h' },
            { y: 0, label: '8h' },
          ]).map((item, idx) => (
            <React.Fragment key={idx}>
              <Line
                x1={leftAxisWidth}
                y1={item.y}
                x2="100%"
                y2={item.y}
                stroke="#E8E7E3"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <SvgText
                x={leftAxisWidth - 6}
                y={item.y + 3}
                fill="#9B9BAF"
                fontSize={9}
                fontFamily="DMSans"
                textAnchor="end"
              >
                {item.label}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Render Bars */}
          {data.map((item, i) => {
            const scaledHeight = Math.min(chartHeight, (item.minutes / maxMinutes) * chartHeight);
            const xPos = leftAxisWidth + i * (barWidth + barGap);
            const yPos = chartHeight - scaledHeight;
            const barColor = getBarColor(item);

            return (
              <React.Fragment key={i}>
                <Rect
                  x={xPos}
                  y={yPos}
                  width={barWidth}
                  height={scaledHeight}
                  rx={4}
                  fill={barColor}
                />
                {/* Remove bottom corner rounding */}
                {scaledHeight > 4 && (
                  <Rect
                    x={xPos}
                    y={yPos + scaledHeight - 4}
                    width={barWidth}
                    height={4}
                    fill={barColor}
                  />
                )}
                {/* X Axis Day Label */}
                <SvgText
                  x={xPos + barWidth / 2}
                  y={chartHeight + 16}
                  fill={item.isToday ? '#5B4FE8' : '#9B9BAF'}
                  fontSize={10}
                  fontFamily="DMMono"
                  fontWeight={item.isToday ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.dayLabel}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Average Line */}
          {avgMinutes > 0 && (
            <Line
              x1={leftAxisWidth}
              y1={avgY}
              x2="100%"
              y2={avgY}
              stroke="#E8A020"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.8}
            />
          )}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  chartWrapper: {
    paddingRight: 10,
  },
});
