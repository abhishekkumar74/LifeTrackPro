import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useEffect } from 'react';
import { tabScrollRefs } from '@/lib/utils/tab-scroll';
import {
  Calendar,
  CheckSquare,
  Clock,
  Share2,
  Flame,
  Zap,
  Award,
  Activity,
  Smile,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
} from 'react-native-svg';

import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AdBanner } from '@/components/ads';

// Custom Hooks & Stats Data Hooks
import {
  usePeriodStats,
  useHeatmapData,
  useBarChartData,
  useSubjectBreakdown,
  useTodayCheckin,
  useLogCheckin,
  useAchievements,
  useEnhancedStats,
} from '@/lib/hooks/use-stats';
import { useTodayStats } from '@/lib/hooks/use-today-stats';
import { useAuthStore } from '@/lib/store/auth.store';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

// Custom Chart & Log Components
import { HeatmapGrid } from '@/components/stats/HeatmapGrid';
import { BarChart } from '@/components/stats/BarChart';
import { DonutChart } from '@/components/stats/DonutChart';
import { MoodPicker } from '@/components/stats/MoodPicker';
import { AchievementCard } from '@/components/stats/AchievementCard';
import { ShareableProgressModal } from '@/components/stats/ShareableProgressModal';

type PeriodType = 'day' | 'week' | 'month';

export default function StatsScreen(): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [focusToggle, setFocusToggle] = useState<'today' | 'week'>('week');
  const [shareProgressModalVisible, setShareProgressModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { profile } = useAuthStore();
  const isPremium = profile?.is_premium || false;

  const handleExportReport = async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }

    try {
      const focusMins = totalPeriodFocusMinutes;
      const hours = (focusMins / 60).toFixed(1);
      const userCategory = profile?.category || 'student';
      
      const reportText = `📊 *LifeTrack Pro - Focus & Productivity Report* ✨\n\n` +
        `👤 *User:* ${profile?.name || 'Achiever'}\n` +
        `🏷️ *Category:* ${userCategory.replace('_', ' ').toUpperCase()}\n` +
        `⏱️ *Weekly Focus Duration:* ${hours} hours\n` +
        `📈 *Weekly Rank:* Top 8% of competitors\n\n` +
        `Keep coding, learning, and tracking! Powered by LifeTrack Pro.`;

      await Share.share({
        message: reportText,
        title: 'LifeTrack Pro Focus Report',
      });
    } catch (err) {
      if (__DEV__) console.warn('Report export error:', err);
    }
  };

  // Tab scroll registration
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    tabScrollRefs['stats'] = scrollRef;
    return () => {
      delete tabScrollRefs['stats'];
    };
  }, []);

  // Enhanced Stats Query
  const enhancedStatsQuery = useEnhancedStats();
  const enhancedStats = enhancedStatsQuery.data;

  // Standard Queries
  const periodStatsQuery = usePeriodStats(selectedPeriod);
  const heatmapQuery = useHeatmapData();
  const barChartQuery = useBarChartData(selectedPeriod);
  const subjectBreakdownQuery = useSubjectBreakdown(selectedPeriod);
  const todayCheckinQuery = useTodayCheckin();
  const achievementsQuery = useAchievements();
  const todayStats = useTodayStats(); // Pull streak count from here

  // Mutations
  const logCheckinMutation = useLogCheckin();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      todayStats.refetch(),
    ]);
    setIsRefreshing(false);
  };

  const handleLogCheckin = (mood: number, energy: number) => {
    logCheckinMutation.mutate({ mood, energy });
  };

  const sortedAchievements = React.useMemo(() => {
    const list = achievementsQuery.data || [];
    return [...list].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return 0;
    });
  }, [achievementsQuery.data]);

  const unlockedCount = React.useMemo(() => {
    const list = achievementsQuery.data || [];
    return list.filter((a) => a.isUnlocked).length;
  }, [achievementsQuery.data]);

  // Aggregate daily average focus minutes for weekly focus
  const dailyAverageFocusHours = React.useMemo(() => {
    const barData = barChartQuery.data || [];
    const activeDays = barData.filter((d) => !d.isFuture);
    const totalMins = activeDays.reduce((sum, d) => sum + d.minutes, 0);
    const avgMins = activeDays.length > 0 ? totalMins / activeDays.length : 0;
    return (avgMins / 60).toFixed(1);
  }, [barChartQuery.data]);

  const totalPeriodFocusMinutes = React.useMemo(() => {
    const barData = barChartQuery.data || [];
    return barData.reduce((sum, d) => sum + d.minutes, 0);
  }, [barChartQuery.data]);

  const renderTrend = (value: number) => {
    if (value === 0) {
      return <Text style={[styles.trendText, { color: '#9B9BAF' }]}>0% vs prev</Text>;
    }
    const isPositive = value > 0;
    return (
      <Text style={[styles.trendText, { color: isPositive ? '#00B894' : '#E85858' }]}>
        {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}
        {value}% vs prev
      </Text>
    );
  };

  const formatPeriodFocusHours = (mins: number) => {
    return `${(mins / 60).toFixed(1)}h`;
  };

  // Determine if it is a completely new user with no focus history
  const isNewUser = React.useMemo(() => {
    const heatmap = heatmapQuery.data || [];
    const totalFocus = heatmap.reduce((sum, d) => sum + d.minutes, 0);
    return !heatmapQuery.isLoading && totalFocus === 0;
  }, [heatmapQuery.data, heatmapQuery.isLoading]);

  // Share Weekly Report Card
  const handleShareReport = async () => {
    if (!enhancedStats?.reportCard) return;
    const {
      monDate,
      thisWeekHours,
      focusDiffHours,
      bestDayName,
      bestDayHours,
      habitConsistencyRate,
      goalsCompletedThisWeek,
    } = enhancedStats.reportCard;

    const formattedMonDate = new Date(monDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const diffText =
      focusDiffHours >= 0
        ? `+${focusDiffHours.toFixed(1)}h more than last week`
        : `${focusDiffHours.toFixed(1)}h less than last week`;

    const message = `📊 My LifeTrack Pro Weekly Report (Week of ${formattedMonDate}):
• Focus Time: ${thisWeekHours.toFixed(1)}h (${diffText})
• Best Focus Day: ${bestDayName} (${bestDayHours.toFixed(1)}h)
• Habits Consistency: ${habitConsistencyRate}%
• Tasks Completed: ${goalsCompletedThisWeek}

Stay focused, track your goals! 🚀`;

    try {
      await Share.share({ message });
    } catch (error) {
      if (__DEV__) {
        console.error('Error sharing report:', error);
      }
    }
  };

  const formatTodayFocus = (mins: number) => {
    if (mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    return `${(mins / 60).toFixed(1)}h`;
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Render SVG Mood Curve
  const renderMoodChart = (moodData: any[]) => {
    const chartHeight = 100;
    const paddingX = 20;
    const paddingY = 15;
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - 40; // padding of scrollview is 20 on each side
    const chartWidth = cardWidth - 32; // section card padding is 16 on each side

    // Map mood values (1 to 5) to coordinates
    const points = moodData.map((d, idx) => {
      const x = paddingX + (idx * (chartWidth - 2 * paddingX)) / 6;
      if (d.mood === null) {
        return { x, y: null, mood: null, dayLabel: d.dayLabel };
      }
      const y =
        chartHeight - paddingY - ((d.mood - 1) * (chartHeight - 2 * paddingY)) / 4;
      return { x, y, mood: d.mood, dayLabel: d.dayLabel };
    });

    const validPoints = points.filter((p) => p.y !== null);

    if (validPoints.length === 0) {
      return (
        <View style={styles.chartEmptyState}>
          <Smile size={24} color="#9B9BAF" />
          <Text style={styles.chartEmptyText}>No mood check-ins logged this week</Text>
        </View>
      );
    }

    let pathD = '';
    let fillD = '';

    if (validPoints.length > 0) {
      pathD = `M ${validPoints[0].x} ${validPoints[0].y}`;
      for (let i = 1; i < validPoints.length; i++) {
        pathD += ` L ${validPoints[i].x} ${validPoints[i].y}`;
      }
      fillD = `${pathD} L ${
        validPoints[validPoints.length - 1].x
      } ${chartHeight} L ${validPoints[0].x} ${chartHeight} Z`;
    }

    const MOOD_EMOJIS = ['', '😫', '😕', '😐', '🙂', '🔥'];

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#5B4FE8" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#5B4FE8" stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = paddingY + (i * (chartHeight - 2 * paddingY)) / 4;
            return (
              <Line
                key={i}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#F2F1EE"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Filled Area */}
          {validPoints.length > 1 && <Path d={fillD} fill="url(#moodGrad)" />}

          {/* Connected Line */}
          {validPoints.length > 1 && (
            <Path
              d={pathD}
              fill="none"
              stroke="#5B4FE8"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Single or multiple dots */}
          {points.map((p, idx) => {
            if (p.y === null) return null;
            return (
              <React.Fragment key={idx}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill="#FFFFFF"
                  stroke="#5B4FE8"
                  strokeWidth={2}
                />
                <SvgText
                  x={p.x}
                  y={p.y - 8}
                  fontSize={10}
                  textAnchor="middle"
                  fontFamily="DMSans"
                >
                  {MOOD_EMOJIS[p.mood || 0]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        {/* X Axis Labels */}
        <View style={styles.chartXAxis}>
          {points.map((p, idx) => (
            <Text
              key={idx}
              style={[styles.chartXLabel, p.y !== null && styles.chartXLabelActive]}
            >
              {p.dayLabel}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Render Habit Grid Checklist
  const renderHabitConsistency = (habitGrid: any[]) => {
    if (habitGrid.length === 0) {
      return (
        <View style={styles.emptyGridState}>
          <Text style={styles.emptyGridText}>No active habits to track</Text>
        </View>
      );
    }

    const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <View>
        {/* Headers */}
        <View style={styles.habitGridHeaderRow}>
          <Text style={styles.habitGridTitleLabel}>HABIT</Text>
          <View style={styles.habitGridDaysLabelsContainer}>
            {DAY_LABELS.map((day, idx) => (
              <Text key={idx} style={styles.habitGridDayHeaderLabel}>
                {day}
              </Text>
            ))}
          </View>
        </View>

        {/* Rows */}
        {habitGrid.map((hg) => (
          <View key={hg.id} style={styles.habitGridRow}>
            <View style={styles.habitGridInfo}>
              <Text style={styles.habitGridEmoji}>{hg.emoji}</Text>
              <Text style={styles.habitGridTitle} numberOfLines={1}>
                {hg.title}
              </Text>
            </View>

            <View style={styles.habitGridDaysContainer}>
              {hg.statuses.map((status: any, idx: number) => {
                let circleStyle: any = styles.habitCircleEmpty;
                let isDone = status.done;

                if (isDone) {
                  circleStyle = styles.habitCircleCompleted;
                } else if (status.isFuture) {
                  circleStyle = styles.habitCircleFuture;
                } else {
                  circleStyle = styles.habitCircleMissed;
                }

                return (
                  <View key={idx} style={[styles.habitCircleBase, circleStyle]}>
                    {isDone && <Text style={styles.habitCheckIcon}>✓</Text>}
                    {!isDone && !status.isFuture && <Text style={styles.habitMissIcon}>·</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Summary Footer */}
        <View style={styles.habitGridSummaryRow}>
          <View style={styles.habitGridSummaryItem}>
            <Text style={styles.habitGridSummaryLabel}>Best Habit</Text>
            <Text style={styles.habitGridSummaryVal} numberOfLines={1}>
              {enhancedStats?.habitConsistency.bestHabitName || 'None'}
            </Text>
          </View>
          <View style={styles.verticalDividerSmall} />
          <View style={styles.habitGridSummaryItem}>
            <Text style={styles.habitGridSummaryLabel}>Needs Work</Text>
            <Text style={styles.habitGridSummaryVal} numberOfLines={1}>
              {enhancedStats?.habitConsistency.worstHabitName || 'None'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render Compact Schedule Compliance card with circular progress donut ring
  const renderScheduleComplianceCompact = (scheduleGrid: any[], completionRate: number) => {
    if (scheduleGrid.length === 0) {
      return (
        <View style={styles.emptyGridState}>
          <Text style={styles.emptyGridText}>No routine schedules active this week</Text>
        </View>
      );
    }

    let totalSlots = 0;
    let completedSlots = 0;
    scheduleGrid.forEach((item) => {
      totalSlots += item.statuses.filter((s: any) => s.isScheduled && s.status !== 'pending').length;
      completedSlots += item.statuses.filter((s: any) => s.status === 'completed').length;
    });

    // Donut chart calculations
    const size = 70;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * completionRate) / 100;

    return (
      <TouchableOpacity
        onPress={() => router.push('/routine_analytics')}
        style={styles.complianceCompactCard}
        activeOpacity={0.7}
      >
        <View style={styles.complianceDonutContainer}>
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F2F1EE"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#5B4FE8"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              // Rotate circle to start from top
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            {/* Percentage Text inside Circle */}
            <SvgText
              x="50%"
              y="50%"
              dy="4"
              textAnchor="middle"
              fill="#17172A"
              fontSize="14"
              fontWeight="bold"
              fontFamily="DMSans-Bold"
            >
              {`${completionRate}%`}
            </SvgText>
          </Svg>
        </View>
        <View style={styles.complianceDetailsContainer}>
          <Text style={styles.complianceCardTitle}>Weekly Compliance</Text>
          <Text style={styles.complianceCardStats}>
            {completedSlots} of {totalSlots} sessions completed
          </Text>
          <Text style={styles.complianceCardSubtitle}>
            Tap to view routine history & details →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isErrorState = (enhancedStatsQuery.isError && !enhancedStats) && (periodStatsQuery.isError && !periodStatsQuery.data);

  if (isErrorState) {
    const errorMsg =
      (enhancedStatsQuery.error as Error)?.message ||
      (periodStatsQuery.error as Error)?.message ||
      'Network connection error. Please check your internet connection and try again.';
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Progress</Text>
          </View>
          <ErrorState message={errorMsg} onRetry={handleRefresh} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>

          {/* Timeframe Segment Selector */}
          <View style={styles.segmentContainer}>
            {(['day', 'week', 'month'] as PeriodType[]).map((period) => {
              const active = selectedPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setSelectedPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#5B4FE8']}
              tintColor="#5B4FE8"
            />
          }
        >
          {/* LIFETRACK WRAPPED / SHARE PROGRESS BANNER */}
          <TouchableOpacity
            style={styles.wrappedBannerCard}
            onPress={() => setShareProgressModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.wrappedLeftContent}>
              <View style={styles.wrappedBadge}>
                <Sparkles size={11} color="#FFD700" />
                <Text style={styles.wrappedBadgeText}>LIFETRACK WRAPPED</Text>
              </View>
              <Text style={styles.wrappedTitle}>Share Your Progress Card ✨</Text>
              <Text style={styles.wrappedSubtitle}>
                Generate a shareable progress report for Instagram Stories & WhatsApp
              </Text>
            </View>
            <View style={styles.wrappedShareIconBg}>
              <Share2 size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* ASPIRANT PEER BENCHMARKING CARD */}
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} color={isPremium ? '#E8A020' : '#9B9BAF'} />
                <Text style={styles.comparisonCardTitle}>Aspirant Benchmarking</Text>
              </View>
              {!isPremium && (
                <View style={styles.goldBadge}>
                  <Text style={styles.goldBadgeText}>GOLD</Text>
                </View>
              )}
            </View>

            {isPremium ? (
              <View style={styles.comparisonContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.comparisonMetric}>Top 8% ✨</Text>
                  
                  <TouchableOpacity
                    style={styles.comparisonExportBtn}
                    onPress={handleExportReport}
                    activeOpacity={0.7}
                  >
                    <Share2 size={12} color="#E8A020" />
                    <Text style={styles.comparisonExportBtnText}>Export Report</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.comparisonDesc}>
                  You focused for {dailyAverageFocusHours}h/day on average. You studied more than 92% of users in the{' '}
                  <Text style={{ fontWeight: 'bold', color: '#E8A020' }}>
                    {profile?.category ? profile.category.replace('_', ' ').toUpperCase() : 'Student'}
                  </Text>{' '}
                  category this week!
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.comparisonLocked}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.8}
              >
                <Text style={styles.comparisonLockedTitle}>Unlock Category Ranking & Benchmarks</Text>
                <Text style={styles.comparisonLockedDesc}>
                  See how your focus time compares with other competitors in your category.
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {isNewUser && (
            <View style={styles.newUserBanner}>
              <View style={{ marginBottom: 8 }}>
                <Activity size={32} color="#5B4FE8" />
              </View>
              <Text style={styles.newUserTitle}>Start focusing to see your stats</Text>
              <Text style={styles.newUserSubtitle}>
                Complete a study session in Focus Mode to unlock visual history, graphs, check-in insights, and achievements.
              </Text>
              <TouchableOpacity
                style={styles.newUserCTA}
                onPress={() => router.push('/focus')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#FFFFFF" />
                  <Text style={styles.newUserCTAText}>Start Focus Session</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ==========================================
              TODAY'S SUMMARY ROW (Enhanced Stats Part 1)
              ========================================== */}
          {enhancedStatsQuery.isLoading ? (
            <View style={styles.todaySummaryRow}>
              <View style={[styles.todaySummaryCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
                <Skeleton width={50} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={30} height={14} />
              </View>
              <View style={[styles.todaySummaryCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
                <Skeleton width={50} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={30} height={14} />
              </View>
              <View style={[styles.todaySummaryCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
                <Skeleton width={50} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={30} height={14} />
              </View>
            </View>
          ) : (
            <View style={styles.todaySummaryRow}>
              {/* Card 1: Today Focus */}
              <View style={styles.todaySummaryCard}>
                <View style={styles.todayCardHeader}>
                  <Clock size={12} color="#5B4FE8" />
                  <Text style={styles.todayCardLabel}>Today Focus</Text>
                </View>
                <Text style={styles.todayCardValue}>
                  {formatTodayFocus(enhancedStats?.todaySummary.focusMinsToday || 0)}
                </Text>
                <Text
                  style={[
                    styles.todayCardSubtext,
                    enhancedStats?.todaySummary.hasBlockerToday
                      ? { color: '#00B894', fontWeight: '600' }
                      : { color: '#9B9BAF' },
                  ]}
                >
                  {enhancedStats?.todaySummary.hasBlockerToday ? 'Deep block active' : 'No blocker'}
                </Text>
              </View>

              {/* Card 2: Today Habits */}
              <View style={styles.todaySummaryCard}>
                <View style={styles.todayCardHeader}>
                  <Award size={12} color="#00B894" />
                  <Text style={styles.todayCardLabel}>Habits</Text>
                </View>
                <Text style={styles.todayCardValue}>
                  {`${enhancedStats?.todaySummary.habitsDoneCount || 0}/${
                    enhancedStats?.todaySummary.habitsTotalCount || 0
                  }`}
                </Text>
                <Text style={styles.todayCardSubtext}>completed today</Text>
              </View>

              {/* Card 3: Today Tasks */}
              <View style={styles.todaySummaryCard}>
                <View style={styles.todayCardHeader}>
                  <CheckSquare size={12} color="#FFB800" />
                  <Text style={styles.todayCardLabel}>Tasks</Text>
                </View>
                <Text style={styles.todayCardValue}>
                  {enhancedStats?.todaySummary.todayTasksDone || 0}
                </Text>
                <Text style={styles.todayCardSubtext}>tasks completed</Text>
              </View>
            </View>
          )}

          {/* ==========================================
              FOCUS STATS SECTION
              ========================================== */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Focus Summary</Text>
            <View style={styles.focusToggleContainer}>
              <TouchableOpacity
                style={[styles.focusToggleBtn, focusToggle === 'today' && styles.focusToggleBtnActive]}
                onPress={() => setFocusToggle('today')}
              >
                <Text style={[styles.focusToggleText, focusToggle === 'today' && styles.focusToggleTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.focusToggleBtn, focusToggle === 'week' && styles.focusToggleBtnActive]}
                onPress={() => setFocusToggle('week')}
              >
                <Text style={[styles.focusToggleText, focusToggle === 'week' && styles.focusToggleTextActive]}>
                  This Week
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {enhancedStatsQuery.isLoading ? (
            <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 18 }} />
          ) : (
            <View style={styles.focusSummaryContainer}>
              {/* Row of Summary Cards */}
              <View style={styles.focusSummaryRow}>
                {/* Total Focus */}
                <View style={styles.focusSummaryCard}>
                  <Text style={styles.focusCardLabel}>Total Focus</Text>
                  <Text style={styles.focusCardValue}>
                    {focusToggle === 'today' 
                      ? `${enhancedStats?.todaySummary.focusMinsToday || 0}m`
                      : `${(enhancedStats?.reportCard.thisWeekHours || 0).toFixed(1)}h`
                    }
                  </Text>
                </View>

                {/* Streak */}
                <View style={styles.focusSummaryCard}>
                  <Text style={styles.focusCardLabel}>Streak</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Flame size={14} color="#E8A020" fill="#E8A020" />
                    <Text style={styles.focusCardValue}>
                      {enhancedStats?.focusStats?.focusStreak || 0}d
                    </Text>
                  </View>
                </View>

                {/* Completed */}
                <View style={styles.focusSummaryCard}>
                  <Text style={styles.focusCardLabel}>Completed</Text>
                  <Text style={styles.focusCardValue}>
                    {enhancedStats?.focusStats?.completedCount || 0}
                  </Text>
                </View>

                {/* Interrupted */}
                <View style={[styles.focusSummaryCard, styles.focusSummaryCardInterrupted]}>
                  <Text style={[styles.focusCardLabel, { color: '#E85858' }]}>Interrupted</Text>
                  <Text style={[styles.focusCardValue, { color: '#E85858' }]}>
                    {enhancedStats?.focusStats?.interruptedCount || 0}
                  </Text>
                </View>
              </View>

              {/* Completed vs Interrupted Ratio Bar */}
              <View style={styles.ratioBarCard}>
                <View style={styles.ratioHeader}>
                  <Text style={styles.ratioTitle}>Completion Ratio</Text>
                  <Text style={styles.ratioValue}>
                    {enhancedStats?.focusStats?.ratioCompleted || 100}% Completed
                  </Text>
                </View>
                <View style={styles.ratioProgressTrack}>
                  <View 
                    style={[
                      styles.ratioProgressFill, 
                      { width: `${enhancedStats?.focusStats?.ratioCompleted || 100}%` }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.ratioProgressInterrupted, 
                      { width: `${enhancedStats?.focusStats?.ratioInterrupted || 0}%` }
                    ]} 
                  />
                </View>
                <View style={styles.ratioFooter}>
                  <View style={styles.ratioIndicator}>
                    <View style={[styles.ratioDot, { backgroundColor: '#00B894' }]} />
                    <Text style={styles.ratioIndicatorText}>Completed</Text>
                  </View>
                  <View style={styles.ratioIndicator}>
                    <View style={[styles.ratioDot, { backgroundColor: '#E85858' }]} />
                    <Text style={styles.ratioIndicatorText}>Interrupted</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ==========================================
              WEEKLY REPORT CARD (Enhanced Stats Part 5)
              ========================================== */}
          {!enhancedStatsQuery.isLoading && enhancedStats?.reportCard && (
            <View style={styles.reportCardContainer}>
              <View style={styles.reportCardHeader}>
                <View style={styles.reportHeaderLeft}>
                  <Sparkles size={16} color="#FFB800" style={styles.sparkleIcon} />
                  <Text style={styles.reportTitle}>This Week's Report</Text>
                </View>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareReport}
                  activeOpacity={0.7}
                >
                  <Share2 size={14} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reportFocusMetric}>
                <Text style={styles.reportFocusLabel}>Total Focus</Text>
                <View style={styles.reportFocusHourRow}>
                  <Text style={styles.reportFocusHours}>
                    {enhancedStats.reportCard.thisWeekHours.toFixed(1)}h
                  </Text>
                  <View
                    style={[
                      styles.reportDiffBadge,
                      enhancedStats.reportCard.focusDiffHours >= 0
                        ? styles.badgePositive
                        : styles.badgeNegative,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reportDiffText,
                        enhancedStats.reportCard.focusDiffHours >= 0
                          ? { color: '#00B894' }
                          : { color: '#E85858' },
                      ]}
                    >
                      {enhancedStats.reportCard.focusDiffHours >= 0 ? '+' : ''}
                      {enhancedStats.reportCard.focusDiffHours.toFixed(1)}h vs prev week
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.reportStatsGrid}>
                {/* Grid Item 1: Best Day */}
                <View style={styles.reportGridItem}>
                  <Text style={styles.reportGridLabel}>Best Day</Text>
                  <Text style={styles.reportGridValue}>
                    {enhancedStats.reportCard.bestDayName}
                  </Text>
                  <Text style={styles.reportGridSub}>
                    {enhancedStats.reportCard.bestDayHours.toFixed(1)}h focused
                  </Text>
                </View>

                {/* Grid Item 2: Habit Rate */}
                <View style={styles.reportGridItem}>
                  <Text style={styles.reportGridLabel}>Habit Rate</Text>
                  <Text style={styles.reportGridValue}>
                    {enhancedStats.reportCard.habitConsistencyRate}%
                  </Text>
                  <Text style={styles.reportGridSub}>completed logs</Text>
                </View>

                {/* Grid Item 3: Tasks Done */}
                <View style={styles.reportGridItem}>
                  <Text style={styles.reportGridLabel}>Goals Met</Text>
                  <Text style={styles.reportGridValue}>
                    {enhancedStats.reportCard.goalsCompletedThisWeek}
                  </Text>
                  <Text style={styles.reportGridSub}>milestones done</Text>
                </View>
              </View>
            </View>
          )}

          {/* SECTION 2: Mood Picker + Streak Card */}
          <View style={styles.sectionCard}>
            <View style={styles.moodStreakRow}>
              {/* Left Column: Mood Log form */}
              <View style={styles.moodCol}>
                <MoodPicker
                  todayCheckin={todayCheckinQuery.data || null}
                  onLog={handleLogCheckin}
                  isLoading={todayCheckinQuery.isLoading || logCheckinMutation.isPending}
                />
              </View>

              {/* Middle vertical line divider */}
              <View style={styles.verticalDivider} />

              {/* Right Column: Streak Widget */}
              <View style={styles.streakCol}>
                <Text style={styles.streakLabel}>STREAK</Text>
                <View style={styles.streakCircle}>
                  <Flame size={20} color="#E8A020" fill="#E8A020" />
                  <Text style={styles.streakNumber}>
                    {todayStats.isLoading ? '-' : todayStats.habitStreak}
                  </Text>
                  <Text style={styles.streakUnit}>days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ==========================================
              HABIT CONSISTENCY SECTION (Enhanced Stats Part 2)
              ========================================== */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Habit Consistency</Text>
            <Text style={styles.sectionSubheading}>This week</Text>
          </View>
          <View style={styles.sectionCard}>
            {enhancedStatsQuery.isLoading ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} width={30} height={30} borderRadius={6} />
                ))}
              </View>
            ) : (
              renderHabitConsistency(enhancedStats?.habitConsistency.grid || [])
            )}
          </View>

          {/* ==========================================
              SCHEDULE COMPLIANCE SECTION
              ========================================== */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Schedule Compliance</Text>
            {!enhancedStatsQuery.isLoading && enhancedStats?.scheduleCompliance && (
              <Text style={styles.sectionSubheading}>
                {enhancedStats.scheduleCompliance.completionRate}% completed this week
              </Text>
            )}
          </View>
          <View style={styles.sectionCard}>
            {enhancedStatsQuery.isLoading ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} width={30} height={30} borderRadius={6} />
                ))}
              </View>
            ) : (
              renderScheduleComplianceCompact(
                enhancedStats?.scheduleCompliance.grid || [],
                enhancedStats?.scheduleCompliance.completionRate || 0
              )
            )}
          </View>

          {/* ==========================================
              MOOD TREND SECTION (Enhanced Stats Part 3)
              ========================================== */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Mood Trend</Text>
            {!enhancedStatsQuery.isLoading && enhancedStats?.moodTrend && (
              <Text style={styles.sectionSubheading}>
                {enhancedStats.moodTrend.moodTrendText}
              </Text>
            )}
          </View>
          <View style={styles.sectionCard}>
            {enhancedStatsQuery.isLoading ? (
              <Skeleton width="100%" height={150} borderRadius={12} />
            ) : (
              renderMoodChart(enhancedStats?.moodTrend.moodData || [])
            )}
          </View>

          {/* ==========================================
              PERSONAL RECORDS SECTION (Enhanced Stats Part 4)
              ========================================== */}
          {!enhancedStatsQuery.isLoading && enhancedStats?.personalRecords && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Personal Records</Text>
                <Text style={styles.sectionSubheading}>All-time bests</Text>
              </View>
              <View style={styles.sectionCard}>
                <View style={styles.recordsList}>
                  {/* Record 1: Streak */}
                  <View style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <View style={[styles.recordIconBg, { backgroundColor: '#FFF8E6' }]}>
                        <Flame size={16} color="#FFB800" />
                      </View>
                      <View>
                        <Text style={styles.recordLabelText}>Longest Habit Streak</Text>
                        <Text style={styles.recordSubtext}>Consistency multiplier</Text>
                      </View>
                    </View>
                    <Text style={styles.recordValueText}>
                      {enhancedStats.personalRecords.longestStreak} days
                    </Text>
                  </View>

                  {/* Record 2: Focus Session */}
                  <View style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <View style={[styles.recordIconBg, { backgroundColor: '#EEECFD' }]}>
                        <Clock size={16} color="#5B4FE8" />
                      </View>
                      <View>
                        <Text style={styles.recordLabelText}>Longest Focus Session</Text>
                        <Text style={styles.recordSubtext}>Single flow state</Text>
                      </View>
                    </View>
                    <Text style={styles.recordValueText}>
                      {enhancedStats.personalRecords.longestSession}m
                    </Text>
                  </View>

                  {/* Record 3: Best Focus Day */}
                  {enhancedStats.personalRecords.bestFocusDayMins > 0 && (
                    <View style={styles.recordItem}>
                      <View style={styles.recordLeft}>
                        <View style={[styles.recordIconBg, { backgroundColor: '#E6F8F4' }]}>
                          <Zap size={16} color="#00B894" />
                        </View>
                        <View>
                          <Text style={styles.recordLabelText}>Best Focus Day</Text>
                          <Text style={styles.recordSubtext}>
                            {formatDateShort(enhancedStats.personalRecords.bestFocusDayDate)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recordValueText}>
                        {(enhancedStats.personalRecords.bestFocusDayMins / 60).toFixed(1)}h
                      </Text>
                    </View>
                  )}

                  {/* Record 4: Most Tasks */}
                  {enhancedStats.personalRecords.bestTaskCount > 0 && (
                    <View style={styles.recordItem}>
                      <View style={styles.recordLeft}>
                        <View style={[styles.recordIconBg, { backgroundColor: '#FDF3F3' }]}>
                          <CheckSquare size={16} color="#E85858" />
                        </View>
                        <View>
                          <Text style={styles.recordLabelText}>Most Tasks Done</Text>
                          <Text style={styles.recordSubtext}>
                            {formatDateShort(enhancedStats.personalRecords.bestTaskDate)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recordValueText}>
                        {enhancedStats.personalRecords.bestTaskCount} tasks
                      </Text>
                    </View>
                  )}

                  {/* Record 5: Best Focus Week */}
                  {enhancedStats.personalRecords.bestWeekMins > 0 && (
                    <View style={[styles.recordItem, { borderBottomWidth: 0 }]}>
                      <View style={styles.recordLeft}>
                        <View style={[styles.recordIconBg, { backgroundColor: '#EEECFD' }]}>
                          <TrendingUp size={16} color="#5B4FE8" />
                        </View>
                        <View>
                          <Text style={styles.recordLabelText}>Best Weekly Total</Text>
                          <Text style={styles.recordSubtext}>Highest weekly hours</Text>
                        </View>
                      </View>
                      <Text style={styles.recordValueText}>
                        {(enhancedStats.personalRecords.bestWeekMins / 60).toFixed(1)}h
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* SECTION 1: Period Stats Breakdown */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Period Stats</Text>
            <Text style={styles.sectionSubheading}>
              {selectedPeriod === 'day'
                ? 'Today'
                : selectedPeriod === 'week'
                ? 'This Week'
                : 'This Month'}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {/* Card 1 - Focus Time */}
            <View style={styles.statsCard}>
              <View style={styles.cardHeader}>
                <Clock size={14} color="#9B9BAF" />
                <Text style={styles.cardLabel}>Focus hours</Text>
              </View>
              {periodStatsQuery.isLoading ? (
                <View style={{ marginTop: 8 }}>
                  <Skeleton width={80} height={28} borderRadius={6} style={{ marginBottom: 4 }} />
                  <Skeleton width={40} height={12} borderRadius={4} />
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.bigNumber}>
                    {formatPeriodFocusHours(periodStatsQuery.data?.focusMinutes || 0)}
                  </Text>
                  {renderTrend(periodStatsQuery.data?.focusChangePercent || 0)}
                </View>
              )}
            </View>

            {/* Card 2 - Tasks Done */}
            <View style={styles.statsCard}>
              <View style={styles.cardHeader}>
                <CheckSquare size={14} color="#9B9BAF" />
                <Text style={styles.cardLabel}>Tasks done</Text>
              </View>
              {periodStatsQuery.isLoading ? (
                <View style={{ marginTop: 8 }}>
                  <Skeleton width={80} height={28} borderRadius={6} style={{ marginBottom: 4 }} />
                  <Skeleton width={40} height={12} borderRadius={4} />
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.bigNumber}>
                    {`${periodStatsQuery.data?.tasksDone || 0}/${
                      periodStatsQuery.data?.tasksTotal || 0
                    }`}
                  </Text>
                  {renderTrend(periodStatsQuery.data?.taskChangePercent || 0)}
                </View>
              )}
            </View>
          </View>

          {/* SECTION 3: Activity Heatmap */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Activity</Text>
            <Text style={styles.sectionSubheading}>90 days</Text>
          </View>
          <View style={styles.sectionCard}>
            <HeatmapGrid data={heatmapQuery.data} isLoading={heatmapQuery.isLoading} />
          </View>

          {/* SECTION 4: Daily Focus Bar Chart */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Daily Focus</Text>
            {!barChartQuery.isLoading && (
              <Text style={styles.sectionSubheading}>Avg {dailyAverageFocusHours}h/day</Text>
            )}
          </View>
          <View style={styles.sectionCard}>
            <BarChart data={barChartQuery.data} isLoading={barChartQuery.isLoading} />
          </View>

          {/* SECTION 5: Subject Breakdown (Only show if focus minutes exist) */}
          {!subjectBreakdownQuery.isLoading && totalPeriodFocusMinutes > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>By Subject</Text>
              </View>
              <View style={styles.sectionCard}>
                <DonutChart
                  data={subjectBreakdownQuery.data}
                  totalMinutes={totalPeriodFocusMinutes}
                  isLoading={subjectBreakdownQuery.isLoading}
                />
              </View>
            </>
          )}

          {/* SECTION 6: Achievements */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Achievements</Text>
            {!achievementsQuery.isLoading && (
              <Text style={styles.sectionSubheading}>{`${unlockedCount}/8 unlocked`}</Text>
            )}
          </View>

          {achievementsQuery.isLoading ? (
            <View style={styles.achievementsGrid}>
              <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 10 }} />
            </View>
          ) : (
            <View style={styles.achievementsGrid}>
              {sortedAchievements.map((item) => (
                <AchievementCard key={item.id} achievement={item} />
              ))}
            </View>
          )}

          {/* AdMob Banner */}
          <AdBanner style={{ marginTop: 16, marginBottom: 24 }} />
        </ScrollView>

        <ShareableProgressModal
          visible={shareProgressModalVisible}
          onClose={() => setShareProgressModalVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 54,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 30,
    color: '#17172A',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F1EE',
    borderRadius: 12,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#9B9BAF',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#17172A',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
  },
  wrappedBannerCard: {
    backgroundColor: '#17172A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  wrappedLeftContent: {
    flex: 1,
    paddingRight: 12,
  },
  wrappedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  wrappedBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  wrappedTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  wrappedSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    lineHeight: 16,
  },
  wrappedShareIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5B4FE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newUserBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newUserEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  newUserTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  newUserSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 18,
  },
  newUserCTA: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  newUserCTAText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Today's Summary Row
  todaySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  todaySummaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 12,
    minHeight: 88,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  todayCardLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    fontWeight: '500',
  },
  todayCardValue: {
    fontFamily: 'DMMono',
    fontSize: 22,
    color: '#17172A',
    fontWeight: 'bold',
  },
  todayCardSubtext: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
    marginTop: 4,
  },
  loaderCard: {
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Weekly Report Card (Navy)
  reportCardContainer: {
    backgroundColor: '#17172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    width: '100%',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIcon: {
    marginTop: -2,
  },
  reportTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#33334F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  shareButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reportFocusMetric: {
    marginBottom: 16,
  },
  reportFocusLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginBottom: 2,
  },
  reportFocusHourRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  reportFocusHours: {
    fontFamily: 'DMMono',
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  reportDiffBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgePositive: {
    backgroundColor: '#00B89420',
  },
  badgeNegative: {
    backgroundColor: '#E8585820',
  },
  reportDiffText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
  },
  reportStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E38',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  reportGridItem: {
    flex: 1,
  },
  reportGridLabel: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
    marginBottom: 4,
  },
  reportGridValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reportGridSub: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
    marginTop: 2,
  },
  // Period Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    minHeight: 100,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardLoader: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  bigNumber: {
    fontFamily: 'DMMono',
    fontSize: 28,
    color: '#17172A',
    fontWeight: 'bold',
  },
  trendText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginBottom: 18,
    width: '100%',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moodStreakRow: {
    flexDirection: 'row',
    width: '100%',
  },
  moodCol: {
    flex: 2.2,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#F2F1EE',
    marginHorizontal: 16,
  },
  streakCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  streakCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 70,
    width: 70,
  },
  streakEmoji: {
    position: 'absolute',
    top: -12,
    fontSize: 18,
    zIndex: 2,
  },
  streakNumber: {
    fontFamily: 'DMMono',
    fontSize: 34,
    color: '#17172A',
    fontWeight: 'bold',
    lineHeight: 38,
  },
  streakUnit: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    marginTop: -2,
  },
  // Habit Consistency Grid styling
  habitGridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
  },
  habitGridTitleLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  habitGridDaysLabelsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  habitGridDayHeaderLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
    fontWeight: '600',
    width: 22,
    textAlign: 'center',
  },
  habitGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6F3',
  },
  habitGridInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  habitGridEmoji: {
    fontSize: 16,
  },
  habitGridTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '500',
    flex: 1,
  },
  habitGridDaysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  habitCircleBase: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCircleEmpty: {
    backgroundColor: '#F2F1EE',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  habitCircleCompleted: {
    backgroundColor: '#00B894',
  },
  habitCircleFuture: {
    borderWidth: 1,
    borderColor: '#9B9BAF',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  habitCircleMissed: {
    backgroundColor: '#FDF3F3',
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  habitCheckIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  habitMissIcon: {
    color: '#E85858',
    fontSize: 12,
    fontWeight: 'bold',
  },
  habitGridSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
  },
  habitGridSummaryItem: {
    flex: 1,
  },
  habitGridSummaryLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    marginBottom: 2,
  },
  habitGridSummaryVal: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#17172A',
    fontWeight: '600',
  },
  verticalDividerSmall: {
    width: 1,
    height: 24,
    backgroundColor: '#F2F1EE',
    marginHorizontal: 16,
  },
  emptyGridState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyGridText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  // Mood Trend Chart Styling
  chartContainer: {
    alignItems: 'center',
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  chartXLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    width: 20,
    textAlign: 'center',
  },
  chartXLabelActive: {
    color: '#17172A',
    fontWeight: '500',
  },
  chartEmptyState: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  chartEmptyText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  // Personal Records List
  recordsList: {
    width: '100%',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F1EE',
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordLabelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '500',
  },
  recordSubtext: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    marginTop: 1,
  },
  recordValueText: {
    fontFamily: 'DMMono',
    fontSize: 14,
    color: '#17172A',
    fontWeight: 'bold',
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '600',
  },
  sectionSubheading: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
  },
  focusToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F1EE',
    borderRadius: 8,
    padding: 1.5,
    gap: 1,
  },
  focusToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  focusToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  focusToggleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#9B9BAF',
  },
  focusToggleTextActive: {
    color: '#17172A',
    fontWeight: '600',
  },
  focusSummaryContainer: {
    width: '100%',
    marginBottom: 20,
  },
  focusSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  focusSummaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  focusSummaryCardInterrupted: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
  },
  focusCardLabel: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
    marginBottom: 4,
    textAlign: 'center',
  },
  focusCardValue: {
    fontFamily: 'DMMono',
    fontSize: 15,
    color: '#17172A',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ratioBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 12,
    marginTop: 2,
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratioTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
    fontWeight: '600',
  },
  ratioValue: {
    fontFamily: 'DMMono',
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  ratioProgressTrack: {
    height: 8,
    backgroundColor: '#E8E7E3',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  ratioProgressFill: {
    height: '100%',
    backgroundColor: '#00B894',
  },
  ratioProgressInterrupted: {
    height: '100%',
    backgroundColor: '#E85858',
  },
  ratioFooter: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  ratioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ratioIndicatorText: {
    fontFamily: 'DMSans',
    fontSize: 9,
    color: '#9B9BAF',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  achievementsLoader: {
    paddingVertical: 40,
    alignItems: 'center',
    width: '100%',
  },
  scheduleBlockColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scheduleCircleNotScheduled: {
    backgroundColor: '#F7F6F3',
    borderWidth: 0,
    opacity: 0.15,
  },
  scheduleCircleSkipped: {
    backgroundColor: '#9B9BAF',
  },
  scheduleSkipIcon: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#5C5C70',
  },
  complianceCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  complianceDonutContainer: {
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  complianceCardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#17172A',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  complianceCardStats: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    marginBottom: 6,
  },
  complianceCardSubtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  comparisonExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232, 160, 32, 0.08)',
    borderColor: 'rgba(232, 160, 32, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  comparisonExportBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    color: '#E8A020',
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonCardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#17172A',
  },
  comparisonContent: {
    gap: 4,
  },
  comparisonMetric: {
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8A020',
  },
  comparisonDesc: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#5C5C70',
    lineHeight: 18,
  },
  comparisonLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  comparisonLockedTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4FE8',
    marginBottom: 4,
    textAlign: 'center',
  },
  comparisonLockedDesc: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    textAlign: 'center',
  },
  goldBadge: {
    backgroundColor: '#E8A020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goldBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
