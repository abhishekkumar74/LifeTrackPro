import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { DailyCheckin, FocusSession, ScheduleBlock, ScheduleLog } from '@/types/app.types';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { useAuthStore } from '@/lib/store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to format Date object into local YYYY-MM-DD string
export function getLocalDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface PeriodStats {
  focusMinutes: number;
  focusMinutesPrev: number;
  focusChangePercent: number;
  tasksTotal: number;
  tasksDone: number;
  tasksDonePrev: number;
  taskChangePercent: number;
  sessionsCount: number;
  avgSessionMinutes: number;
  topSubject: string | null;
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface BarDay {
  dayLabel: string;
  date: string;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface SubjectSlice {
  subject: string;
  minutes: number;
  percentage: number;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

// 1. usePeriodStats Hook
export function usePeriodStats(period: 'day' | 'week' | 'month') {
  const { user } = useAuthStore();
  const cacheKey = `stats_period_${user?.id}_${period}`;

  return useQuery<PeriodStats>({
    queryKey: ['stats', user?.id, 'period', period],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const userId = session.user.id;

        const today = new Date();
        let periodStart = new Date(today);
        let periodEnd = new Date(today);
        let prevStart = new Date(today);
        let prevEnd = new Date(today);

        if (period === 'day') {
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(23, 59, 59, 999);

          prevStart = new Date(periodStart);
          prevStart.setDate(prevStart.getDate() - 1);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd = new Date(periodEnd);
          prevEnd.setDate(prevEnd.getDate() - 1);
          prevEnd.setHours(23, 59, 59, 999);
        } else if (period === 'week') {
          const dayOfWeek = today.getDay();
          const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          periodStart.setDate(today.getDate() - distanceToMonday);
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);

          prevStart = new Date(periodStart);
          prevStart.setDate(prevStart.getDate() - 7);
          prevStart.setHours(0, 0, 0, 0);
          
          prevEnd = new Date(prevStart);
          prevEnd.setDate(prevEnd.getDate() + 6);
          prevEnd.setHours(23, 59, 59, 999);
        } else {
          // Month
          periodStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
          periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

          prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
          prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        }

        // Parallel Queries
        const [
          curSessionsRes,
          prevSessionsRes,
          curTasksRes,
          prevTasksRes,
        ] = await Promise.all([
          supabase
            .from('focus_sessions')
            .select('duration_min, subject, status')
            .eq('user_id', userId)
            .gte('started_at', periodStart.toISOString())
            .lt('started_at', periodEnd.toISOString()),
          supabase
            .from('focus_sessions')
            .select('duration_min, status')
            .eq('user_id', userId)
            .gte('started_at', prevStart.toISOString())
            .lt('started_at', prevEnd.toISOString()),
          supabase
            .from('tasks')
            .select('completed_at')
            .eq('user_id', userId)
            .gte('created_at', periodStart.toISOString())
            .lt('created_at', periodEnd.toISOString()),
          supabase
            .from('tasks')
            .select('completed_at')
            .eq('user_id', userId)
            .gte('created_at', prevStart.toISOString())
            .lt('created_at', prevEnd.toISOString()),
        ]);

        if (curSessionsRes.error) throw curSessionsRes.error;
        if (prevSessionsRes.error) throw prevSessionsRes.error;
        if (curTasksRes.error) throw curTasksRes.error;
        if (prevTasksRes.error) throw prevTasksRes.error;

        const curSessions = curSessionsRes.data || [];
        const prevSessions = prevSessionsRes.data || [];

        // 1. Focus Minutes (completed sessions only)
        const focusMinutes = curSessions
          .filter(s => s.status !== 'interrupted')
          .reduce((sum, s) => sum + s.duration_min, 0);
        const focusMinutesPrev = prevSessions
          .filter(s => s.status !== 'interrupted')
          .reduce((sum, s) => sum + s.duration_min, 0);
        const focusChangePercent = focusMinutesPrev === 0 
          ? (focusMinutes > 0 ? 100 : 0) 
          : Math.round(((focusMinutes - focusMinutesPrev) / focusMinutesPrev) * 100);

        // 2. Tasks
        const tasksTotal = (curTasksRes.data || []).length;
        const tasksDone = (curTasksRes.data || []).filter(t => t.completed_at !== null).length;
        const tasksDonePrev = (prevTasksRes.data || []).filter(t => t.completed_at !== null).length;
        const taskChangePercent = tasksDonePrev === 0
          ? (tasksDone > 0 ? 100 : 0)
          : Math.round(((tasksDone - tasksDonePrev) / tasksDonePrev) * 100);

        // 3. Sessions (completed vs interrupted)
        const completedCount = curSessions.filter(s => s.status !== 'interrupted').length;
        const interruptedCount = curSessions.filter(s => s.status === 'interrupted').length;
        const sessionsCount = completedCount;
        const avgSessionMinutes = sessionsCount > 0 ? Math.round(focusMinutes / sessionsCount) : 0;

        // 4. Top Subject (completed sessions only)
        const subjectMins: { [lowerSubject: string]: number } = {};
        const subjectDisplayNames: { [lowerSubject: string]: string } = {};
        curSessions
          .filter(s => s.status !== 'interrupted')
          .forEach(s => {
            if (s.subject) {
              const trimmed = s.subject.trim();
              if (trimmed) {
                const lower = trimmed.toLowerCase();
                subjectMins[lower] = (subjectMins[lower] || 0) + s.duration_min;
                
                const existingDisplay = subjectDisplayNames[lower];
                if (!existingDisplay) {
                  subjectDisplayNames[lower] = trimmed;
                } else {
                  const existingUpper = (existingDisplay.match(/[A-Z]/g) || []).length;
                  const currentUpper = (trimmed.match(/[A-Z]/g) || []).length;
                  if (currentUpper > existingUpper) {
                    subjectDisplayNames[lower] = trimmed;
                  }
                }
              }
            }
          });
        let topSubject: string | null = null;
        let maxMins = 0;
        Object.keys(subjectMins).forEach(lower => {
          if (subjectMins[lower] > maxMins) {
            maxMins = subjectMins[lower];
            topSubject = subjectDisplayNames[lower];
          }
        });

        const result = {
          focusMinutes,
          focusMinutesPrev,
          focusChangePercent,
          tasksTotal,
          tasksDone,
          tasksDonePrev,
          taskChangePercent,
          sessionsCount,
          avgSessionMinutes,
          topSubject,
          completedCount,
          interruptedCount,
        };

        AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
        return result;
      } catch (err: any) {
        const isNetError = 
          err.message?.toLowerCase().includes('network') || 
          err.message?.toLowerCase().includes('fetch') || 
          err.message?.toLowerCase().includes('timeout') ||
          err.status === 0;

        if (isNetError) {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        }
        throw err;
      }
    },
    enabled: !!user?.id,
  });
}

// 2. useHeatmapData Hook
export function useHeatmapData() {
  const { user } = useAuthStore();
  const cacheKey = `stats_heatmap_${user?.id}`;

  return useQuery<HeatmapDay[]>({
    queryKey: ['stats', user?.id, 'heatmap'],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 89); // Last 90 days total
      startDate.setHours(12, 0, 0, 0); // Set to noon to be completely DST-safe

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('started_at, duration_min')
        .eq('user_id', session.user.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;

      console.log(`[HEATMAP DIAGNOSTIC] Found ${data?.length || 0} sessions for user ${session.user.id}`);
      if (data && data.length > 0) {
        console.log("[HEATMAP DIAGNOSTIC] Raw database sessions:", data.map(s => ({ started_at: s.started_at, duration: s.duration_min })));
      }

      // Aggregate minutes by local YYYY-MM-DD
      const dateMinutesMap: { [dateStr: string]: number } = {};
      (data || []).forEach((fs) => {
        const d = new Date(fs.started_at);
        const dateStr = getLocalDateStr(d);
        dateMinutesMap[dateStr] = (dateMinutesMap[dateStr] || 0) + fs.duration_min;
        console.log(`[HEATMAP DIAGNOSTIC] Parsed session started_at: ${fs.started_at} -> local Date object: ${d.toString()} -> local dateStr: ${dateStr}`);
      });

      console.log("[HEATMAP DIAGNOSTIC] dateMinutesMap keys and values:", dateMinutesMap);

      // Fill in all 90 days
      const result: HeatmapDay[] = [];
      const oneDayMs = 24 * 60 * 60 * 1000;
      const startMs = startDate.getTime();

      for (let i = 0; i < 90; i++) {
        const current = new Date(startMs + i * oneDayMs);
        const dateStr = getLocalDateStr(current);
        const minutes = dateMinutesMap[dateStr] || 0;

        let intensity: 0 | 1 | 2 | 3 | 4 = 0;
        if (minutes > 180) intensity = 4;
        else if (minutes > 90) intensity = 3;
        else if (minutes > 30) intensity = 2;
        else if (minutes > 0) intensity = 1;

        result.push({
          date: dateStr,
          minutes,
          intensity,
        });
      }

      console.log("[HEATMAP DIAGNOSTIC] Today's date calculated in loop:", getLocalDateStr(new Date()));
      console.log("[HEATMAP DIAGNOSTIC] Last element in result:", result[result.length - 1]);

      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
      return result;
    } catch (err: any) {
      const isNetError = 
        err.message?.toLowerCase().includes('network') || 
        err.message?.toLowerCase().includes('fetch') || 
        err.message?.toLowerCase().includes('timeout') ||
        err.status === 0;

      if (isNetError) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      throw err;
    }
  },
  enabled: !!user?.id,
});
}

// Shared Hook to fetch focus sessions for the current week (to be shared between BarChart and DonutChart)
function usePeriodFocusSessions(period: 'day' | 'week' | 'month') {
  const { user } = useAuthStore();
  const cacheKey = `stats_period_sessions_${user?.id}_${period}`;

  return useQuery<FocusSession[]>({
    queryKey: ['stats', user?.id, 'period-sessions', period],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

      const today = new Date();
      let periodStart = new Date(today);
      let periodEnd = new Date(today);

      if (period === 'day') {
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        const dayOfWeek = today.getDay();
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        periodStart.setDate(today.getDate() - distanceToMonday);
        periodStart.setHours(0, 0, 0, 0);
        
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
      } else {
        // Month
        periodStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('started_at', periodStart.toISOString())
        .lt('started_at', periodEnd.toISOString());

      if (error) throw error;
      const result = data as FocusSession[];

      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
      return result;
    } catch (err: any) {
      const isNetError = 
        err.message?.toLowerCase().includes('network') || 
        err.message?.toLowerCase().includes('fetch') || 
        err.message?.toLowerCase().includes('timeout') ||
        err.status === 0;

      if (isNetError) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      throw err;
    }
  },
  enabled: !!user?.id,
});
}

// 3. useBarChartData Hook
export function useBarChartData(period: 'day' | 'week' | 'month') {
  const { data: sessions, isLoading, error } = usePeriodFocusSessions(period);
  const { user } = useAuthStore();

  const chartData = useQuery<BarDay[]>({
    queryKey: ['stats', user?.id, 'bar-chart', period, sessions?.length],
    queryFn: async () => {
      const today = new Date();
      const todayStr = getLocalDateStr(today);

      const result: BarDay[] = [];

      if (period === 'day') {
        // Hourly breakdown for today (24 hours)
        const hourMinutesMap: { [hour: number]: number } = {};
        for (let i = 0; i < 24; i++) {
          hourMinutesMap[i] = 0;
        }

        if (sessions) {
          sessions
            .filter(s => s.status !== 'interrupted')
            .forEach((s) => {
              const d = new Date(s.started_at);
              if (getLocalDateStr(d) === todayStr) {
                const hour = d.getHours();
                hourMinutesMap[hour] = (hourMinutesMap[hour] || 0) + s.duration_min;
              }
            });
        }

        const currentHour = today.getHours();

        for (let i = 0; i < 24; i++) {
          const ampm = i >= 12 ? 'pm' : 'am';
          const displayHour = i % 12 === 0 ? 12 : i % 12;
          const dayLabel = `${displayHour}${ampm}`;
          const isToday = i === currentHour;
          const isFuture = i > currentHour;

          result.push({
            dayLabel,
            date: `${todayStr}T${String(i).padStart(2, '0')}:00:00`,
            minutes: hourMinutesMap[i],
            isToday,
            isFuture,
          });
        }
      } else if (period === 'week') {
        const dayOfWeek = today.getDay();
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        monday.setHours(0, 0, 0, 0);

        const dateMinutesMap: { [dateStr: string]: number } = {};
        if (sessions) {
          sessions
            .filter(s => s.status !== 'interrupted')
            .forEach((s) => {
              const d = new Date(s.started_at);
              const dateStr = getLocalDateStr(d);
              dateMinutesMap[dateStr] = (dateMinutesMap[dateStr] || 0) + s.duration_min;
            });
        }

        const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        for (let i = 0; i < 7; i++) {
          const current = new Date(monday);
          current.setDate(monday.getDate() + i);
          const dateStr = getLocalDateStr(current);
          const isToday = dateStr === todayStr;
          const isFuture = current.getTime() > today.getTime() && !isToday;

          result.push({
            dayLabel: dayLabels[i],
            date: dateStr,
            minutes: dateMinutesMap[dateStr] || 0,
            isToday,
            isFuture,
          });
        }
      } else {
        // Month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const daysInMonth = endOfMonth.getDate();

        const dateMinutesMap: { [dateStr: string]: number } = {};
        if (sessions) {
          sessions
            .filter(s => s.status !== 'interrupted')
            .forEach((s) => {
              const d = new Date(s.started_at);
              const dateStr = getLocalDateStr(d);
              dateMinutesMap[dateStr] = (dateMinutesMap[dateStr] || 0) + s.duration_min;
            });
        }

        for (let i = 1; i <= daysInMonth; i++) {
          const current = new Date(today.getFullYear(), today.getMonth(), i);
          const dateStr = getLocalDateStr(current);
          const isToday = dateStr === todayStr;
          const isFuture = current.getTime() > today.getTime() && !isToday;

          result.push({
            dayLabel: String(i),
            date: dateStr,
            minutes: dateMinutesMap[dateStr] || 0,
            isToday,
            isFuture,
          });
        }
      }

      return result;
    },
    enabled: sessions !== undefined,
  });

  return {
    data: chartData.data,
    isLoading: isLoading || chartData.isLoading,
    error: error || chartData.error,
  };
}

// 4. useSubjectBreakdown Hook
export function useSubjectBreakdown(period: 'day' | 'week' | 'month') {
  const { data: sessions, isLoading, error } = usePeriodFocusSessions(period);
  const { user } = useAuthStore();

  const breakdownData = useQuery<SubjectSlice[]>({
    queryKey: ['stats', user?.id, 'subject-breakdown', period, sessions?.length],
    queryFn: async () => {
      if (!sessions || sessions.length === 0) return [];

      const subjectMins: { [lowerSubject: string]: number } = {};
      const subjectDisplayNames: { [lowerSubject: string]: string } = {};
      let totalMinutes = 0;

      sessions.forEach((s) => {
        if (s.subject) {
          const trimmed = s.subject.trim();
          if (trimmed) {
            const lower = trimmed.toLowerCase();
            subjectMins[lower] = (subjectMins[lower] || 0) + s.duration_min;
            totalMinutes += s.duration_min;
            
            const existingDisplay = subjectDisplayNames[lower];
            if (!existingDisplay) {
              subjectDisplayNames[lower] = trimmed;
            } else {
              const existingUpper = (existingDisplay.match(/[A-Z]/g) || []).length;
              const currentUpper = (trimmed.match(/[A-Z]/g) || []).length;
              if (currentUpper > existingUpper) {
                subjectDisplayNames[lower] = trimmed;
              }
            }
          }
        }
      });

      if (totalMinutes === 0) return [];

      const result: SubjectSlice[] = Object.keys(subjectMins).map((lower) => {
        const minutes = subjectMins[lower];
        const percentage = Math.round((minutes * 100) / totalMinutes);
        const displayName = subjectDisplayNames[lower];
        return {
          subject: displayName,
          minutes,
          percentage,
          color: getSubjectColor(displayName),
        };
      });

      // Sort descending by minutes
      return result.sort((a, b) => b.minutes - a.minutes);
    },
    enabled: sessions !== undefined,
  });

  return {
    data: breakdownData.data,
    isLoading: isLoading || breakdownData.isLoading,
    error: error || breakdownData.error,
  };
}

// 5. useMoodHistory Hook
export function useMoodHistory() {
  const { user } = useAuthStore();
  return useQuery<DailyCheckin[]>({
    queryKey: ['stats', user?.id, 'mood-history'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 29); // Last 30 days
      const startDateStr = getLocalDateStr(startDate);

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as DailyCheckin[];
    },
  });
}

// 6. useTodayCheckin Hook
export function useTodayCheckin() {
  const { user } = useAuthStore();
  return useQuery<DailyCheckin | null>({
    queryKey: ['stats', user?.id, 'today-checkin'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const todayStr = getLocalDateStr(new Date());

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (error) throw error;
      return data as DailyCheckin | null;
    },
  });
}

// 7. useLogCheckin Hook
export function useLogCheckin() {
  const queryClient = useQueryClient();

  return useMutation<DailyCheckin, Error, { mood: number; energy: number }, { previousCheckin: DailyCheckin | null | undefined }>({
    mutationFn: async ({ mood, energy }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const todayStr = getLocalDateStr(new Date());

      const { data, error } = await supabase
        .from('daily_checkins')
        .upsert(
          {
            user_id: session.user.id,
            date: todayStr,
            mood,
            energy,
            note: null,
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as DailyCheckin;
    },
    onMutate: async ({ mood, energy }) => {
      const user = useAuthStore.getState().user;
      await queryClient.cancelQueries({ queryKey: ['stats', user?.id, 'today-checkin'] });
      await queryClient.cancelQueries({ queryKey: ['stats', user?.id, 'mood-history'] });

      const previousCheckin = queryClient.getQueryData<DailyCheckin | null>(['stats', user?.id, 'today-checkin']);

      const todayStr = getLocalDateStr(new Date());
      const mockCheckin: DailyCheckin = {
        id: 'temp-id',
        user_id: '',
        date: todayStr,
        mood,
        energy,
        note: null,
        created_at: new Date().toISOString(),
      };

      // Optimistically update today checkin
      queryClient.setQueryData(['stats', user?.id, 'today-checkin'], mockCheckin);

      return { previousCheckin };
    },
    onError: (_err, _variables, context) => {
      const user = useAuthStore.getState().user;
      if (context) {
        queryClient.setQueryData(['stats', user?.id, 'today-checkin'], context.previousCheckin);
      }
    },
    onSuccess: (newCheckin) => {
      const user = useAuthStore.getState().user;
      queryClient.setQueryData(['stats', user?.id, 'today-checkin'], newCheckin);
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id, 'mood-history'] });
    },
  });
}

// 7b. useUpsertScheduleLog Hook
export function useUpsertScheduleLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockId,
      date,
      status,
      skipReason = null,
    }: {
      blockId: string;
      date: string;
      status: 'completed' | 'skipped' | 'missed';
      skipReason?: 'Sick' | 'Travelling' | 'Other' | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_logs')
        .upsert(
          {
            user_id: session.user.id,
            block_id: blockId,
            date,
            status,
            skip_reason: skipReason,
          },
          { onConflict: 'user_id,block_id,date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as ScheduleLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['manageRoutinesList'] });
    },
  });
}

// 8. useAchievements Hook
export function useAchievements() {
  const { user } = useAuthStore();
  // Query all user focus sessions, goals and habit logs in parallel
  return useQuery<Achievement[]>({
    queryKey: ['stats', user?.id, 'achievements'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const userId = session.user.id;

      const [focusRes, goalsRes, habitsRes] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('started_at, duration_min, subject')
          .eq('user_id', userId)
          .order('started_at', { ascending: true }),
        supabase
          .from('goals')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('habit_logs')
          .select('date')
          .eq('user_id', userId)
          .eq('done', true)
          .order('date', { ascending: true }),
      ]);

      if (focusRes.error) throw focusRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (habitsRes.error) throw habitsRes.error;

      const sessions = focusRes.data || [];
      const goals = goalsRes.data || [];
      const habitLogs = habitsRes.data || [];

      // Calculate parameters
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_min, 0);

      // 1. first_session
      const firstSessionUnlocked = totalSessions >= 1;
      const firstSessionDate = firstSessionUnlocked ? getLocalDateStr(new Date(sessions[0].started_at)) : undefined;

      // 2. week_warrior (7 consecutive days with focus)
      const focusDates = Array.from(new Set(sessions.map(s => getLocalDateStr(new Date(s.started_at))))).sort();
      let consecutiveFocus = 0;
      let maxConsecutiveFocus = 0;
      let weekWarriorDate: string | undefined;

      for (let i = 0; i < focusDates.length; i++) {
        if (i === 0) {
          consecutiveFocus = 1;
        } else {
          const prev = new Date(focusDates[i - 1]);
          const curr = new Date(focusDates[i]);
          const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            consecutiveFocus++;
          } else if (diff > 1) {
            consecutiveFocus = 1;
          }
        }
        if (consecutiveFocus >= 7 && !weekWarriorDate) {
          weekWarriorDate = focusDates[i];
        }
        if (consecutiveFocus > maxConsecutiveFocus) {
          maxConsecutiveFocus = consecutiveFocus;
        }
      }
      const weekWarriorUnlocked = maxConsecutiveFocus >= 7;

      // 3. century_club (total focus >= 6000 min / 100 hrs)
      const centuryClubUnlocked = totalMinutes >= 6000;
      let centuryClubDate: string | undefined;
      if (centuryClubUnlocked) {
        let runningMinutes = 0;
        for (const s of sessions) {
          runningMinutes += s.duration_min;
          if (runningMinutes >= 6000) {
            centuryClubDate = getLocalDateStr(new Date(s.started_at));
            break;
          }
        }
      }

      // 4. streak_30 (habit streak >= 30 days)
      const logDates = Array.from(new Set(habitLogs.map(l => l.date))).sort();
      let consecutiveHabits = 0;
      let maxConsecutiveHabits = 0;
      let streak30Date: string | undefined;

      for (let i = 0; i < logDates.length; i++) {
        if (i === 0) {
          consecutiveHabits = 1;
        } else {
          const prev = new Date(logDates[i - 1]);
          const curr = new Date(logDates[i]);
          const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            consecutiveHabits++;
          } else if (diff > 1) {
            consecutiveHabits = 1;
          }
        }
        if (consecutiveHabits >= 30 && !streak30Date) {
          streak30Date = logDates[i];
        }
        if (consecutiveHabits > maxConsecutiveHabits) {
          maxConsecutiveHabits = consecutiveHabits;
        }
      }
      const streak30Unlocked = maxConsecutiveHabits >= 30;

      // 5. goal_setter
      const goalSetterUnlocked = goals.length >= 1;
      const goalSetterDate = goalSetterUnlocked ? getLocalDateStr(new Date(goals[0].created_at)) : undefined;

      // 6. early_bird (any focus session started before 7 AM local)
      const earlyBirdSessions = sessions.filter(s => new Date(s.started_at).getHours() < 7);
      const earlyBirdUnlocked = earlyBirdSessions.length >= 1;
      const earlyBirdDate = earlyBirdUnlocked ? getLocalDateStr(new Date(earlyBirdSessions[0].started_at)) : undefined;

      // 7. night_owl (any focus session started after 10 PM local)
      const nightOwlSessions = sessions.filter(s => new Date(s.started_at).getHours() >= 22);
      const nightOwlUnlocked = nightOwlSessions.length >= 1;
      const nightOwlDate = nightOwlUnlocked ? getLocalDateStr(new Date(nightOwlSessions[0].started_at)) : undefined;

      // 8. subject_master (any subject with > 1000 mins focus time)
      const subMins: { [sub: string]: number } = {};
      let masterSubject: string | null = null;
      let subjectMasterDate: string | undefined;

      for (const s of sessions) {
        if (s.subject) {
          subMins[s.subject] = (subMins[s.subject] || 0) + s.duration_min;
          if (subMins[s.subject] >= 1000 && !masterSubject) {
            masterSubject = s.subject;
            subjectMasterDate = getLocalDateStr(new Date(s.started_at));
          }
        }
      }
      const subjectMasterUnlocked = masterSubject !== null;

      const list: Achievement[] = [
        {
          id: 'first_session',
          title: 'First Focus Session',
          description: 'Completed your first focus session.',
          emoji: '⏱️',
          isUnlocked: firstSessionUnlocked,
          unlockedAt: firstSessionDate,
        },
        {
          id: 'week_warrior',
          title: 'Week Warrior',
          description: 'Focused on 7 consecutive days.',
          emoji: '⚡',
          isUnlocked: weekWarriorUnlocked,
          unlockedAt: weekWarriorDate,
        },
        {
          id: 'century_club',
          title: 'Century Club',
          description: 'Focused for 100+ hours (6,000 mins).',
          emoji: '💯',
          isUnlocked: centuryClubUnlocked,
          unlockedAt: centuryClubDate,
        },
        {
          id: 'streak_30',
          title: '30-Day Streak',
          description: 'Achieved a habit streak of 30 days.',
          emoji: '🔥',
          isUnlocked: streak30Unlocked,
          unlockedAt: streak30Date,
        },
        {
          id: 'goal_setter',
          title: 'Goal Setter',
          description: 'Set at least one target goal.',
          emoji: '🎯',
          isUnlocked: goalSetterUnlocked,
          unlockedAt: goalSetterDate,
        },
        {
          id: 'early_bird',
          title: 'Early Bird',
          description: 'Started a focus session before 7:00 AM.',
          emoji: '🌅',
          isUnlocked: earlyBirdUnlocked,
          unlockedAt: earlyBirdDate,
        },
        {
          id: 'night_owl',
          title: 'Night Owl',
          description: 'Started a focus session after 10:00 PM.',
          emoji: '🦉',
          isUnlocked: nightOwlUnlocked,
          unlockedAt: nightOwlDate,
        },
        {
          id: 'subject_master',
          title: 'Subject Master',
          description: 'Focused on a single subject for 1,000+ mins.',
          emoji: '👑',
          isUnlocked: subjectMasterUnlocked,
          unlockedAt: subjectMasterDate,
        },
      ];

      return list;
    },
  });
}

// 9. useEnhancedStats Hook
export function useEnhancedStats() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['stats', user?.id, 'enhanced'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const userId = session.user.id;

      // 1. Fetch data in parallel
      const [
        sessionsRes,
        habitLogsRes,
        tasksRes,
        checkinsRes,
        activeHabitsRes,
        scheduleBlocksRes,
        scheduleLogsRes
      ] = await Promise.all([
        supabase.from('focus_sessions').select('*').eq('user_id', userId),
        supabase.from('habit_logs').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('daily_checkins').select('*').eq('user_id', userId),
        supabase.from('habits').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('schedule_blocks').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('schedule_logs').select('*').eq('user_id', userId)
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (habitLogsRes.error) throw habitLogsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (checkinsRes.error) throw checkinsRes.error;
      if (activeHabitsRes.error) throw activeHabitsRes.error;
      if (scheduleBlocksRes.error) throw scheduleBlocksRes.error;
      if (scheduleLogsRes.error) throw scheduleLogsRes.error;

      const sessions = sessionsRes.data || [];
      const habitLogs = habitLogsRes.data || [];
      const tasks = tasksRes.data || [];
      const checkins = checkinsRes.data || [];
      const activeHabits = activeHabitsRes.data || [];
      const scheduleBlocks = (scheduleBlocksRes.data || []) as ScheduleBlock[];
      const scheduleLogs = (scheduleLogsRes.data || []) as ScheduleLog[];

      const todayStr = getLocalDateStr(new Date());

      // ==========================================
      // TODAY'S SUMMARY
      // ==========================================
      const todaySessions = sessions.filter(s => getLocalDateStr(new Date(s.started_at)) === todayStr);
      const todayFocusMins = todaySessions
        .filter(s => s.status !== 'interrupted')
        .reduce((sum, s) => sum + s.duration_min, 0);
      const focusMinsToday = todayFocusMins;
      const hasBlockerToday = todaySessions.length > 0;
      
      // Habits completed today
      const todayHabitLogs = habitLogs.filter(l => l.date === todayStr);
      const habitsDoneCount = todayHabitLogs.filter(l => l.done).length;
      const habitsTotalCount = activeHabits.length;

      // Tasks completed today
      const todayTasksDone = tasks.filter(t => t.completed_at && getLocalDateStr(new Date(t.completed_at)) === todayStr).length;

      // ==========================================
      // FOCUS STREAK & SESSIONS RATIO
      // ==========================================
      const completedFocusDates = new Set(
        sessions
          .filter(s => s.status !== 'interrupted')
          .map(s => getLocalDateStr(new Date(s.started_at)))
      );

      let focusStreak = 0;
      const yesterdayStr = getLocalDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));

      if (completedFocusDates.has(todayStr)) {
        focusStreak = 1;
        const checkDate = new Date();
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = getLocalDateStr(checkDate);
          if (completedFocusDates.has(dateStr)) {
            focusStreak++;
          } else {
            break;
          }
        }
      } else if (completedFocusDates.has(yesterdayStr)) {
        focusStreak = 1;
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = getLocalDateStr(checkDate);
          if (completedFocusDates.has(dateStr)) {
            focusStreak++;
          } else {
            break;
          }
        }
      }

      const allTimeCompletedCount = sessions.filter(s => s.status !== 'interrupted').length;
      const allTimeInterruptedCount = sessions.filter(s => s.status === 'interrupted').length;
      const allTimeFocusMinutes = sessions
        .filter(s => s.status !== 'interrupted')
        .reduce((sum, s) => sum + s.duration_min, 0);

      // ==========================================
      // WEEKLY HABIT CONSISTENCY
      // ==========================================
      // Get current week dates (Monday to Sunday)
      const getWeekDatesStr = () => {
        const today = new Date();
        const day = today.getDay();
        const distance = day === 0 ? 6 : day - 1; // monday is 1
        const monday = new Date(today);
        monday.setDate(today.getDate() - distance);
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          dates.push(getLocalDateStr(d));
        }
        return dates;
      };
      const weekDates = getWeekDatesStr();

      const habitGrid = activeHabits.map(habit => {
        const habitLogsThisWeek = habitLogs.filter(l => l.habit_id === habit.id);
        const statuses = weekDates.map(date => {
          const log = habitLogsThisWeek.find(l => l.date === date);
          const isFuture = date > todayStr;
          return {
            date,
            isFuture,
            done: log ? log.done : false,
            hasRecord: !!log
          };
        });

        const completedCount = statuses.filter(s => s.done).length;

        return {
          id: habit.id,
          title: habit.title,
          emoji: habit.emoji,
          statuses,
          completedCount
        };
      });

      // Best and Needs work
      let bestHabitName = 'None';
      let bestHabitCount = -1;
      let worstHabitName = 'None';
      let worstHabitCount = 999;

      habitGrid.forEach(hg => {
        if (hg.completedCount > bestHabitCount) {
          bestHabitCount = hg.completedCount;
          bestHabitName = hg.title;
        }
        if (hg.completedCount < worstHabitCount) {
          worstHabitCount = hg.completedCount;
          worstHabitName = hg.title;
        }
      });

      // ==========================================
      // WEEKLY SCHEDULE COMPLIANCE
      // ==========================================
      const scheduleGrid = scheduleBlocks.map(block => {
        const blockLogs = scheduleLogs.filter(l => l.block_id === block.id);
        const statuses = weekDates.map(date => {
          const log = blockLogs.find(l => l.date === date);
          
          let isScheduled = false;
          if (block.specific_date) {
            isScheduled = block.specific_date === date;
          } else if (block.days) {
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
            isScheduled = block.days.includes(dayOfWeek);
          }

          let status: 'completed' | 'skipped' | 'missed' | 'pending' | 'none' = 'none';
          
          if (isScheduled) {
            if (log) {
              status = log.status as 'completed' | 'skipped' | 'missed';
            } else if (date > todayStr) {
              status = 'pending';
            } else if (date < todayStr) {
              status = 'missed';
            } else {
              // It is today! Check if end_time has passed
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const eParts = block.end_time.split(':');
              const endMinutes = eParts.length >= 2 ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10) : 0;
              
              if (currentMinutes > endMinutes) {
                status = 'missed';
              } else {
                status = 'pending';
              }
            }
          }

          return {
            date,
            isScheduled,
            status,
            skipReason: log?.skip_reason || null,
          };
        });

        const activeDaysCount = statuses.filter(s => s.isScheduled).length;
        const completedCount = statuses.filter(s => s.status === 'completed').length;
        const skippedCount = statuses.filter(s => s.status === 'skipped').length;
        const missedCount = statuses.filter(s => s.status === 'missed').length;

        return {
          id: block.id,
          title: block.title,
          subject: block.subject,
          color: block.color,
          statuses,
          activeDaysCount,
          completedCount,
          skippedCount,
          missedCount
        };
      }).filter(gridItem => gridItem.activeDaysCount > 0);

      // Calculate weekly schedule completion rate
      let totalScheduledSlots = 0;
      let totalCompletedSlots = 0;
      scheduleGrid.forEach(item => {
        totalScheduledSlots += item.statuses.filter(s => s.isScheduled && s.status !== 'pending').length;
        totalCompletedSlots += item.statuses.filter(s => s.status === 'completed').length;
      });

      const scheduleCompletionRate = totalScheduledSlots > 0
        ? Math.round((totalCompletedSlots / totalScheduledSlots) * 100)
        : 100;

      // ==========================================
      // DAILY MOOD TREND
      // ==========================================
      const moodByDate: Record<string, number> = {};
      checkins.forEach(c => {
        moodByDate[c.date] = c.mood;
      });

      const moodData = weekDates.map((date, idx) => {
        const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        return {
          dayLabel: dayLabels[idx],
          date,
          mood: moodByDate[date] || null, // null if no record
        };
      });

      // Calc average mood this week
      const currentWeekCheckins = checkins.filter(c => weekDates.includes(c.date));
      const avgMoodThisWeek = currentWeekCheckins.length > 0
        ? Math.round(currentWeekCheckins.reduce((sum, c) => sum + c.mood, 0) / currentWeekCheckins.length)
        : null;

      // Calc average mood last week
      const lastWeekDates = weekDates.map(dStr => {
        const d = new Date(dStr);
        d.setDate(d.getDate() - 7);
        return getLocalDateStr(d);
      });
      const lastWeekCheckins = checkins.filter(c => lastWeekDates.includes(c.date));
      const avgMoodLastWeek = lastWeekCheckins.length > 0
        ? lastWeekCheckins.reduce((sum, c) => sum + c.mood, 0) / lastWeekCheckins.length
        : null;

      let moodTrendText = 'No trend data yet';
      if (avgMoodThisWeek && avgMoodLastWeek) {
        if (avgMoodThisWeek > avgMoodLastWeek) {
          moodTrendText = 'Better than last week ↑';
        } else if (avgMoodThisWeek < avgMoodLastWeek) {
          moodTrendText = 'Lower than last week ↓';
        } else {
          moodTrendText = 'Same as last week';
        }
      }

      // ==========================================
      // PERSONAL RECORDS
      // ==========================================
      // 1. Longest habit streak (any habit)
      const logsByHabit: Record<string, string[]> = {};
      habitLogs.forEach(log => {
        if (log.done) {
          if (!logsByHabit[log.habit_id]) {
            logsByHabit[log.habit_id] = [];
          }
          logsByHabit[log.habit_id].push(log.date);
        }
      });
      
      let longestStreak = 0;
      Object.keys(logsByHabit).forEach(habitId => {
        const dates = Array.from(new Set(logsByHabit[habitId])).sort();
        if (dates.length === 0) return;
        
        let currentLongest = 0;
        let currentRun = 0;
        let prevDate: Date | null = null;
        
        for (const dateStr of dates) {
          const curDate = new Date(dateStr);
          if (prevDate === null) {
            currentRun = 1;
          } else {
            const diff = curDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              currentRun++;
            } else if (diffDays > 1) {
              if (currentRun > currentLongest) {
                currentLongest = currentRun;
              }
              currentRun = 1;
            }
          }
          prevDate = curDate;
        }
        if (currentRun > currentLongest) {
          currentLongest = currentRun;
        }
        if (currentLongest > longestStreak) {
          longestStreak = currentLongest;
        }
      });

      // 2. Longest focus session (completed only)
      const longestSession = sessions
        .filter(s => s.status !== 'interrupted')
        .reduce((max, s) => s.duration_min > max ? s.duration_min : max, 0);

      // 3. Best focus day (completed only)
      const dayFocus: Record<string, number> = {};
      sessions
        .filter(s => s.status !== 'interrupted')
        .forEach(s => {
          const dStr = getLocalDateStr(new Date(s.started_at));
          dayFocus[dStr] = (dayFocus[dStr] || 0) + s.duration_min;
        });
      let bestFocusDayDate = '';
      let bestFocusDayMins = 0;
      Object.keys(dayFocus).forEach(dStr => {
        if (dayFocus[dStr] > bestFocusDayMins) {
          bestFocusDayMins = dayFocus[dStr];
          bestFocusDayDate = dStr;
        }
      });

      // 4. Most tasks in a day
      const completedTasks = tasks.filter(t => t.completed_at !== null);
      const dayTasks: Record<string, number> = {};
      completedTasks.forEach(t => {
        const dStr = getLocalDateStr(new Date(t.completed_at!));
        dayTasks[dStr] = (dayTasks[dStr] || 0) + 1;
      });
      let bestTaskDate = '';
      let bestTaskCount = 0;
      Object.keys(dayTasks).forEach(dStr => {
        if (dayTasks[dStr] > bestTaskCount) {
          bestTaskCount = dayTasks[dStr];
          bestTaskDate = dStr;
        }
      });

      // 5. Best week
      const getMondayOfDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        return getLocalDateStr(mon);
      };
      const weekFocus: Record<string, number> = {};
      sessions
        .filter(s => s.status !== 'interrupted')
        .forEach(s => {
          const monStr = getMondayOfDate(getLocalDateStr(new Date(s.started_at)));
          weekFocus[monStr] = (weekFocus[monStr] || 0) + s.duration_min;
        });
      let bestWeekMins = 0;
      Object.keys(weekFocus).forEach(wStr => {
        if (weekFocus[wStr] > bestWeekMins) {
          bestWeekMins = weekFocus[wStr];
        }
      });

      // ==========================================
      // WEEKLY REPORT CARD
      // ==========================================
      const thisWeekSessions = sessions.filter(s => s.status !== 'interrupted' && weekDates.includes(getLocalDateStr(new Date(s.started_at))));
      const thisWeekMins = thisWeekSessions.reduce((sum, s) => sum + s.duration_min, 0);
      const thisWeekHours = thisWeekMins / 60;

      const lastWeekSessions = sessions.filter(s => s.status !== 'interrupted' && lastWeekDates.includes(getLocalDateStr(new Date(s.started_at))));
      const lastWeekMins = lastWeekSessions.reduce((sum, s) => sum + s.duration_min, 0);
      const lastWeekHours = lastWeekMins / 60;

      const focusDiffHours = thisWeekHours - lastWeekHours;

      // Find best day this week
      const thisWeekDayFocus: Record<string, number> = {};
      thisWeekSessions.forEach(s => {
        const dStr = getLocalDateStr(new Date(s.started_at));
        thisWeekDayFocus[dStr] = (thisWeekDayFocus[dStr] || 0) + s.duration_min;
      });
      let thisWeekBestDayName = 'None';
      let thisWeekBestDayMins = 0;
      const WEEK_DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      Object.keys(thisWeekDayFocus).forEach(dStr => {
        if (thisWeekDayFocus[dStr] > thisWeekBestDayMins) {
          thisWeekBestDayMins = thisWeekDayFocus[dStr];
          thisWeekBestDayName = WEEK_DAYS_NAMES[new Date(dStr).getDay()];
        }
      });

      // Habits consistency this week
      const totalExpectedLogsThisWeek = activeHabits.length * 7;
      const totalActualLogsThisWeek = habitLogs.filter(l => l.done && weekDates.includes(l.date)).length;
      const habitConsistencyRate = totalExpectedLogsThisWeek > 0
        ? Math.round((totalActualLogsThisWeek / totalExpectedLogsThisWeek) * 100)
        : 0;

      // Goals completed this week
      const goalsCompletedThisWeek = completedTasks.filter(t => weekDates.includes(getLocalDateStr(new Date(t.completed_at!)))).length;

      return {
        todaySummary: {
          focusMinsToday,
          hasBlockerToday,
          habitsDoneCount,
          habitsTotalCount,
          todayTasksDone
        },
        habitConsistency: {
          grid: habitGrid,
          bestHabitName,
          bestHabitCount,
          worstHabitName,
          worstHabitCount
        },
        scheduleCompliance: {
          grid: scheduleGrid,
          completionRate: scheduleCompletionRate
        },
        moodTrend: {
          moodData,
          avgMoodThisWeek,
          avgMoodLastWeek,
          moodTrendText
        },
        personalRecords: {
          longestStreak,
          longestSession,
          bestFocusDayDate,
          bestFocusDayMins,
          bestTaskDate,
          bestTaskCount,
          bestWeekMins
        },
        reportCard: {
          monDate: weekDates[0],
          thisWeekHours,
          focusDiffHours,
          bestDayName: thisWeekBestDayName,
          bestDayHours: thisWeekBestDayMins / 60,
          habitConsistencyRate,
          goalsCompletedThisWeek
        },
        focusStats: {
          focusStreak,
          completedCount: allTimeCompletedCount,
          interruptedCount: allTimeInterruptedCount,
          totalFocusMins: allTimeFocusMinutes,
          ratioCompleted: allTimeCompletedCount + allTimeInterruptedCount > 0 
            ? Math.round((allTimeCompletedCount / (allTimeCompletedCount + allTimeInterruptedCount)) * 100) 
            : 100,
          ratioInterrupted: allTimeCompletedCount + allTimeInterruptedCount > 0 
            ? Math.round((allTimeInterruptedCount / (allTimeCompletedCount + allTimeInterruptedCount)) * 100) 
            : 0,
        }
      };
    }
  });
}

