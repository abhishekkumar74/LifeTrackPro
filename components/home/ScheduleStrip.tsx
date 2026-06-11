import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ScheduleBlock } from '@/types/app.types';
import { getSubjectColor } from '@/lib/utils/subject-colors';

// Constants
const HEADER_TITLE = "Today's schedule";
const SEE_ALL = "See all";
const EMPTY_STATE = "No schedule today";
const ADD_ROUTINE = "Add routine →";
const SHADOW_COLOR = '#000000';
const BORDER_COLOR = '#E8E7E3';

interface ScheduleStripProps {
  blocks: ScheduleBlock[];
  isLoading: boolean;
  onSeeAll: () => void;
  onAddSchedule?: () => void;
}

export const ScheduleStrip = React.memo<ScheduleStripProps>(({
  blocks,
  isLoading,
  onSeeAll,
  onAddSchedule,
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [isLoading]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const calculateDuration = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return '';
    const sParts = startStr.split(':');
    const eParts = endStr.split(':');
    if (sParts.length < 2 || eParts.length < 2) return '';
    const sMin = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
    const eMin = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
    const diffMin = eMin - sMin;
    if (diffMin <= 0) return '';
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const isBlockActiveNow = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const sParts = startTime.split(':');
    const eParts = endTime.split(':');
    if (sParts.length < 2 || eParts.length < 2) return false;

    const startMinutes = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
    const endMinutes = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  // Sort active blocks to the top
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => {
      const aActive = isBlockActiveNow(a.start_time, a.end_time);
      const bActive = isBlockActiveNow(b.start_time, b.end_time);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [blocks]);

  if (isLoading) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.addBtnText, { opacity: 0.5, marginRight: 12 }]}>+ Add block</Text>
            <Text style={styles.seeAllText}>{SEE_ALL}</Text>
          </View>
        </View>
        {[1, 2].map((key) => (
          <View key={key} style={styles.blockItem}>
            <View style={styles.skeletonLeftBar} />
            <View style={styles.middleArea}>
              <Animated.View style={[styles.skeletonTime, pulseStyle]} />
              <Animated.View style={[styles.skeletonTitle, pulseStyle]} />
            </View>
            <Animated.View style={[styles.skeletonDuration, pulseStyle]} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{HEADER_TITLE}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onAddSchedule} activeOpacity={0.6} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add block</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.6}>
            <Text style={styles.seeAllText}>{SEE_ALL}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sortedBlocks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{EMPTY_STATE}</Text>
          <TouchableOpacity onPress={onAddSchedule} activeOpacity={0.6}>
            <Text style={styles.emptyLink}>{ADD_ROUTINE}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sortedBlocks.map((block) => {
          const accentColor = getSubjectColor(block.subject);
          const timeFormatted = formatTimeString(block.start_time);
          const durationFormatted = calculateDuration(block.start_time, block.end_time);
          const isActive = isBlockActiveNow(block.start_time, block.end_time);

          return (
            <View
              key={block.id}
              style={[
                styles.blockItem,
                isActive && styles.blockItemActive,
              ]}
            >
              {/* Color Bar */}
              <View style={[styles.colorBar, { backgroundColor: accentColor }]} />

              {/* Middle Title / Time */}
              <View style={styles.middleArea}>
                <View style={styles.timeRow}>
                  {isActive && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>NOW</Text>
                    </View>
                  )}
                  <Text style={styles.timeText}>{timeFormatted}</Text>
                </View>
                <Text style={styles.blockTitle} numberOfLines={1}>
                  {block.title}
                </Text>
              </View>

              {/* Right Duration */}
              {durationFormatted ? (
                <Text style={styles.durationText}>{durationFormatted}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
  },
  seeAllText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    marginRight: 12,
  },
  addBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  blockItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  blockItemActive: {
    backgroundColor: '#EAE8FD',
    borderColor: '#5B4FE8',
    borderWidth: 1,
  },
  colorBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  middleArea: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowBadge: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  nowBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  timeText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  blockTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 2,
  },
  durationText: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    marginBottom: 4,
  },
  emptyLink: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  // Skeleton Layouts
  skeletonLeftBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#E8E7E3',
    marginRight: 12,
  },
  skeletonTime: {
    width: 60,
    height: 10,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
    marginBottom: 4,
  },
  skeletonTitle: {
    width: 120,
    height: 13,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
  },
  skeletonDuration: {
    width: 25,
    height: 11,
    backgroundColor: '#E8E7E3',
    borderRadius: 2,
  },
});
