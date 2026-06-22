import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
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
const barGap = 8;

export const BarChart: React.FC<BarChartProps> = ({ data = [], isLoading }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const leftAxisWidth = 30;
  const isScrollable = data.length > 7;

  const barWidth = React.useMemo(() => {
    if (isScrollable) {
      return 14;
    }
    const margin = 40;
    const availableWidth = screenWidth - margin - leftAxisWidth;
    return (availableWidth - 6 * barGap) / 7;
  }, [data.length, screenWidth, isScrollable]);

  const chartWidth = React.useMemo(() => {
    if (isScrollable) {
      return data.length * (barWidth + barGap) + 10;
    }
    return screenWidth - 40 - leftAxisWidth;
  }, [data.length, barWidth, isScrollable, screenWidth]);

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
  const maxMinutes = React.useMemo(() => {
    if (!data || data.length === 0) return 60;
    const maxVal = Math.max(...data.map(d => d.minutes), 0);
    if (maxVal <= 60) return 60;
    if (maxVal <= 180) return 180;
    return 480;
  }, [data]);

  const { avgY, avgMinutes } = React.useMemo(() => {
    if (!data || data.length === 0) return { avgY: 0, avgMinutes: 0 };
    const completedDays = data.filter((d) => !d.isFuture);
    const total = completedDays.reduce((sum, d) => sum + d.minutes, 0);
    const avg = completedDays.length > 0 ? total / completedDays.length : 0;
    
    const scaledHeight = Math.min(chartHeight, (avg / maxMinutes) * chartHeight);
    const yVal = chartHeight - scaledHeight;
    return { avgY: yVal, avgMinutes: avg };
  }, [data, maxMinutes]);

  const yAxisItems = React.useMemo(() => {
    const intervals = [0, 0.25, 0.5, 0.75, 1];
    return intervals.map((fraction) => {
      const mins = fraction * maxMinutes;
      const y = chartHeight - fraction * chartHeight;
      let label = '0';
      if (mins > 0) {
        if (mins < 60) {
          label = `${Math.round(mins)}m`;
        } else {
          label = `${(mins / 60).toFixed(0)}h`;
        }
      }
      return { y, label };
    });
  }, [maxMinutes]);

  const getBarColor = (item: BarDay) => {
    if (item.isToday) return '#5B4FE8'; // full violet
    if (item.isFuture || item.minutes === 0) return '#E8E7E3'; // grey
    return '#C7BFFE'; // past with data (light violet)
  };

  if (isLoading) {
    const skeletonHeights = [40, 20, 65, 10, 50, 30, 15];
    return (
      <Animated.View style={[styles.container, skeletonStyle]}>
        <View style={{ flexDirection: 'row' }}>
          {/* Skeleton Y-Axis Labels */}
          <View style={{ width: leftAxisWidth, height: chartHeight + 20, justifyContent: 'flex-start' }}>
            {[80, 60, 40, 20, 0].map((y, idx) => (
              <Text
                key={idx}
                style={{
                  position: 'absolute',
                  top: y - 6,
                  right: 6,
                  color: '#E8E7E3',
                  fontSize: 9,
                  fontFamily: 'DMSans',
                }}
              >
                -
              </Text>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Svg width="100%" height={chartHeight + 20}>
              {[0, 20, 40, 60, 80].map((y, idx) => (
                <Line
                  key={idx}
                  x1={0}
                  y1={y}
                  x2="100%"
                  y2={y}
                  stroke="#F2F1EE"
                  strokeWidth={1}
                />
              ))}

              {skeletonHeights.map((h, i) => {
                const xPos = i * (barWidth + barGap);
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
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row' }}>
        {/* Fixed Y-Axis Labels */}
        <View style={{ width: leftAxisWidth, height: chartHeight + 22, justifyContent: 'flex-start' }}>
          {yAxisItems.map((item, idx) => (
            <Text
              key={idx}
              style={{
                position: 'absolute',
                top: item.y - 6,
                right: 6,
                color: '#9B9BAF',
                fontSize: 9,
                fontFamily: 'DMSans',
                textAlign: 'right',
              }}
            >
              {item.label}
            </Text>
          ))}
        </View>

        {/* Scrollable / Static Bars Area */}
        <View style={{ flex: 1 }}>
          {isScrollable ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg width={chartWidth} height={chartHeight + 22}>
                {/* Guidelines */}
                {yAxisItems.map((item, idx) => (
                  <Line
                    key={idx}
                    x1={0}
                    y1={item.y}
                    x2={chartWidth}
                    y2={item.y}
                    stroke="#E8E7E3"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Bars */}
                {data.map((item, i) => {
                  const scaledHeight = Math.min(chartHeight, (item.minutes / maxMinutes) * chartHeight);
                  const xPos = i * (barWidth + barGap);
                  const yPos = chartHeight - scaledHeight;
                  const barColor = getBarColor(item);

                  // Label rendering logic:
                  // For month: show label for dates divisible by 5, or 1st/last to avoid overlap
                  // For day: show label every 4 hours (e.g. 12am, 4am, 8am, 12pm, 4pm, 8pm)
                  let shouldShowLabel = true;
                  if (data.length > 20) {
                    const dayNum = parseInt(item.dayLabel, 10);
                    shouldShowLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === data.length;
                  } else if (data.length === 24) {
                    const hourNum = i;
                    shouldShowLabel = hourNum % 4 === 0;
                  }

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
                      {scaledHeight > 4 && (
                        <Rect
                          x={xPos}
                          y={yPos + scaledHeight - 4}
                          width={barWidth}
                          height={4}
                          fill={barColor}
                        />
                      )}
                      {shouldShowLabel && (
                        <SvgText
                          x={xPos + barWidth / 2}
                          y={chartHeight + 16}
                          fill={item.isToday ? '#5B4FE8' : '#9B9BAF'}
                          fontSize={9}
                          fontFamily="DMMono"
                          fontWeight={item.isToday ? 'bold' : 'normal'}
                          textAnchor="middle"
                        >
                          {item.dayLabel}
                        </SvgText>
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
            </ScrollView>
          ) : (
            // Non-scrollable (Weekly view)
            <Svg width="100%" height={chartHeight + 22}>
              {/* Guidelines */}
              {yAxisItems.map((item, idx) => (
                <Line
                  key={idx}
                  x1={0}
                  y1={item.y}
                  x2="100%"
                  y2={item.y}
                  stroke="#E8E7E3"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              ))}

              {/* Bars */}
              {data.map((item, i) => {
                const scaledHeight = Math.min(chartHeight, (item.minutes / maxMinutes) * chartHeight);
                const xPos = i * (barWidth + barGap);
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
                    {scaledHeight > 4 && (
                      <Rect
                        x={xPos}
                        y={yPos + scaledHeight - 4}
                        width={barWidth}
                        height={4}
                        fill={barColor}
                      />
                    )}
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
                  x1={0}
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
          )}
        </View>
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
