import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ScheduleBlock, ScheduleSkipEntry } from '@/types/app.types';
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
  onPressBlock?: (block: ScheduleBlock) => void;
  onLongPressBlock?: (block: ScheduleBlock) => void;
  doneBlockIds?: string[];
  skippedBlockIds?: string[];
  skipsLog?: ScheduleSkipEntry[];
  onMarkDone?: (blockId: string) => void;
  onSkipToday?: (blockId: string) => void;
}

export const ScheduleStrip = React.memo<ScheduleStripProps>(({
  blocks,
  isLoading,
  onSeeAll,
  onAddSchedule,
  onPressBlock,
  onLongPressBlock,
  doneBlockIds = [],
  skippedBlockIds = [],
  skipsLog = [],
  onMarkDone,
  onSkipToday,
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
          const isDone = doneBlockIds.includes(block.id);
          const isSkipped = skippedBlockIds.includes(block.id);

          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const eParts = block.end_time.split(':');
          const endMinutes = eParts.length >= 2 ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10) : 0;
          const isMissed = !isDone && !isSkipped && (currentMinutes > endMinutes);
          const isActive = !isDone && !isSkipped && !isMissed && isBlockActiveNow(block.start_time, block.end_time);

          // Skip limit check
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          const hasUsedSkipThisWeek = skipsLog.some(entry => {
            if (entry.blockId !== block.id) return false;
            const entryDate = new Date(entry.date).getTime();
            return entryDate >= sevenDaysAgo && entry.date !== todayStr;
          });

          const skipReason = isSkipped 
            ? (skipsLog.find(entry => entry.blockId === block.id && entry.date === todayStr)?.reason || 'Skipped')
            : null;

          const accentColor = getSubjectColor(block.subject);
          const timeFormatted = formatTimeString(block.start_time);
          const durationFormatted = calculateDuration(block.start_time, block.end_time);

          let itemStyle: any[] = [styles.blockItem];
          let colorBarColor = accentColor;

          if (isDone) {
            itemStyle.push(styles.blockItemCompleted);
            colorBarColor = '#00B894';
          } else if (isSkipped) {
            itemStyle.push(styles.blockItemSkipped);
            colorBarColor = '#9B9BAF';
          } else if (isMissed) {
            itemStyle.push(styles.blockItemMissed);
            colorBarColor = '#E85858';
          } else if (isActive) {
            itemStyle.push(styles.blockItemActive);
          }

          return (
            <TouchableOpacity
              key={block.id}
              style={itemStyle}
              onPress={() => !isSkipped && !isDone && onPressBlock && onPressBlock(block)}
              onLongPress={() => !isSkipped && !isDone && onLongPressBlock && onLongPressBlock(block)}
              activeOpacity={isSkipped || isDone ? 1 : 0.8}
            >
              {/* Color Bar */}
              <View style={[styles.colorBar, { backgroundColor: colorBarColor }]} />

              {/* Middle Title / Time */}
              <View style={styles.middleArea}>
                <View style={styles.timeRow}>
                  {isActive && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>NOW</Text>
                    </View>
                  )}
                  {isMissed && (
                    <View style={styles.missedBadge}>
                      <Text style={styles.missedBadgeText}>MISSED</Text>
                    </View>
                  )}
                  <Text style={styles.timeText}>
                    {timeFormatted}
                    {isSkipped && ` • Skipped (${skipReason})`}
                  </Text>
                </View>
                <Text 
                  style={[
                    styles.blockTitle,
                    isDone && styles.blockTitleCompleted,
                    isSkipped && styles.blockTitleSkipped
                  ]} 
                  numberOfLines={1}
                >
                  {block.title}
                </Text>
              </View>

              {/* Right area: duration or actions */}
              <View style={styles.rightActionArea}>
                {isDone ? (
                  <View style={styles.statusBadgeCompleted}>
                    <Text style={styles.statusBadgeTextCompleted}>DONE</Text>
                  </View>
                ) : isSkipped ? (
                  <View style={styles.statusBadgeSkipped}>
                    <Text style={styles.statusBadgeTextSkipped}>SKIPPED</Text>
                  </View>
                ) : (
                  <Text style={styles.durationText}>{durationFormatted}</Text>
                )}
              </View>
            </TouchableOpacity>
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
  blockItemCompleted: {
    backgroundColor: '#F4FBF7',
    borderColor: '#00B894',
    borderWidth: 1,
  },
  blockItemSkipped: {
    backgroundColor: '#F5F5F7',
    borderColor: '#D2D2D7',
    borderWidth: 1,
    opacity: 0.8,
  },
  blockItemMissed: {
    backgroundColor: '#FFF5F5',
    borderColor: '#E85858',
    borderWidth: 1,
  },
  rightActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnDone: {
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextDone: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtnSkip: {
    backgroundColor: '#F2F1EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  actionBtnTextSkip: {
    color: '#17172A',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextCompleted: {
    color: '#00B894',
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    fontWeight: '700',
  },
  statusBadgeSkipped: {
    backgroundColor: 'rgba(155, 155, 175, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextSkipped: {
    color: '#9B9BAF',
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    fontWeight: '700',
  },
  skipLimitBadge: {
    backgroundColor: '#F2F1EE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLimitText: {
    color: '#9B9BAF',
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '500',
  },
  missedBadge: {
    backgroundColor: '#E85858',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  missedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  blockTitleCompleted: {
    color: '#9B9BAF',
  },
  blockTitleSkipped: {
    color: '#9B9BAF',
  },
});
