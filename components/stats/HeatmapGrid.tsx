import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export interface HeatmapDay {
  date: string;
  minutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapGridProps {
  data?: HeatmapDay[];
  isLoading: boolean;
}

const numCols = 12;
const numRows = 8;
const totalCells = numCols * numRows; // 96
const gap = 4;
const margin = 40;

const COLORS = {
  0: '#E8E7E3',
  1: '#C7BFFE',
  2: '#9D8FFB',
  3: '#7460F0',
  4: '#5B4FE8',
};

export const HeatmapGrid = React.memo<HeatmapGridProps>(({ data = [], isLoading }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const cellSize = (screenWidth - margin - (numCols - 1) * gap) / numCols;
  const gridHeight = numRows * (cellSize + gap) - gap;

  // Tooltip state
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    minutes: number;
    col: number;
    row: number;
  } | null>(null);

  // Reset tooltip when data updates
  useEffect(() => {
    setSelectedCell(null);
  }, [data]);

  // Loading animation values
  const pulseOpacity = useSharedValue(0.4);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Pad the incoming data to exactly 96 cells, aligning old dates to the top-left
  const paddedData = React.useMemo(() => {
    const arr = [...data];
    while (arr.length < totalCells) {
      arr.unshift({
        date: '',
        minutes: 0,
        intensity: 0,
      });
    }
    return arr;
  }, [data]);

  // Determine which column should display month labels
  const monthLabels = React.useMemo(() => {
    const labels: { col: number; name: string }[] = [];
    let lastMonth = '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let c = 0; c < numCols; c++) {
      // Look at the first valid cell date in the column
      let colDateStr = '';
      for (let r = 0; r < numRows; r++) {
        const item = paddedData[c * numRows + r];
        if (item && item.date) {
          colDateStr = item.date;
          break;
        }
      }

      if (colDateStr) {
        const dateObj = new Date(colDateStr);
        const monthName = months[dateObj.getMonth()];
        if (monthName !== lastMonth) {
          labels.push({ col: c, name: monthName });
          lastMonth = monthName;
        }
      }
    }

    return labels;
  }, [paddedData]);

  const handleCellPress = (item: HeatmapDay, col: number, row: number) => {
    if (!item.date) return;
    
    // Toggle tooltip if already active on same cell
    if (selectedCell && selectedCell.date === item.date) {
      setSelectedCell(null);
    } else {
      setSelectedCell({
        date: item.date,
        minutes: item.minutes,
        col,
        row,
      });
    }
  };

  const formatTooltipTime = (mins: number) => {
    if (mins === 0) return '0 minutes focused';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0) {
      return `${hrs}h ${m}m focused`;
    }
    return `${m}m focused`;
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  if (isLoading) {
    return (
      <Animated.View style={[styles.container, skeletonStyle]}>
        {/* Month labels spacing */}
        <View style={styles.monthLabelsRow}>
          <Text style={styles.monthLabelText}>...</Text>
        </View>
        <Svg width="100%" height={gridHeight}>
          {Array.from({ length: totalCells }).map((_, idx) => {
            const row = idx % numRows;
            const col = Math.floor(idx / numRows);
            return (
              <Rect
                key={idx}
                x={col * (cellSize + gap)}
                y={row * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                ry={2}
                fill="#E8E7E3"
              />
            );
          })}
        </Svg>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month Labels above columns */}
      <View style={styles.monthLabelsRow}>
        {monthLabels.map((lbl, idx) => {
          const colX = lbl.col * (cellSize + gap);
          return (
            <Text
              key={idx}
              style={[styles.monthLabelText, { left: colX }]}
            >
              {lbl.name}
            </Text>
          );
        })}
      </View>

      <View style={{ position: 'relative' }}>
        <Svg width="100%" height={gridHeight}>
          {paddedData.map((item, idx) => {
            const row = idx % numRows;
            const col = Math.floor(idx / numRows);
            const isClickable = !!item.date;

            return (
              <Rect
                key={idx}
                x={col * (cellSize + gap)}
                y={row * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                ry={2}
                fill={COLORS[item.intensity]}
                onPress={() => isClickable && handleCellPress(item, col, row)}
              />
            );
          })}
        </Svg>

        {/* Tooltip callout bubble */}
        {selectedCell && (
          <View
            style={[
              styles.tooltipBubble,
              {
                left: Math.max(
                  10,
                  Math.min(
                    screenWidth - 170,
                    selectedCell.col * (cellSize + gap) + cellSize / 2 - 80
                  )
                ),
                top: selectedCell.row * (cellSize + gap) - 58,
              },
            ]}
          >
            <View style={styles.tooltipInner}>
              <Text style={styles.tooltipDate}>{formatDateStr(selectedCell.date)}</Text>
              <Text style={styles.tooltipMins}>{formatTooltipTime(selectedCell.minutes)}</Text>
            </View>
            <View style={styles.tooltipArrow} />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  monthLabelsRow: {
    height: 18,
    position: 'relative',
    width: '100%',
    marginBottom: 4,
  },
  monthLabelText: {
    position: 'absolute',
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
  },
  tooltipBubble: {
    position: 'absolute',
    width: 160,
    zIndex: 100,
    alignItems: 'center',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipInner: {
    backgroundColor: '#17172A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
  },
  tooltipDate: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#E8E7E3',
    fontWeight: '600',
  },
  tooltipMins: {
    fontFamily: 'DMMono',
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
    borderTopColor: '#17172A',
    alignSelf: 'center',
  },
});
