import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Polyfill WebSocket for Server-Side Rendering (SSR) pre-rendering in Node.js
if (typeof WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    send(): void {}
    close(): void {}
  }
  Object.defineProperty(globalThis, 'WebSocket', {
    value: MockWebSocket,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Safe, hybrid storage adapter supporting both mobile (AsyncStorage),
 * web browser (localStorage), and Node.js server-side rendering (SSR memory mock).
 */
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

// --- INDEPENDENT DATA MODEL ROW INTERFACES ---

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  category: string;
  sub_category: string[];
  daily_hours: number;
  peak_time: string;
  xp_points: number;
  level: number;
  is_premium: boolean;
  focus_seeds: number;
  unlocked_plants: string[];
  ai_insight: string | null;
  ai_insight_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  timeline: string;
  deadline: string;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type MilestoneRow = {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  status: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type TaskRow = {
  id: string;
  user_id: string;
  milestone_id: string | null;
  title: string;
  subject: string | null;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recur_days: number[] | null;
  created_at: string;
  updated_at: string;
}

export type HabitRow = {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  frequency: string;
  order_index: number;
  is_active: boolean;
  custom_days?: number[] | null;
  best_time?: 'morning' | 'afternoon' | 'evening' | null;
  created_at: string;
  updated_at: string;
}

export type HabitLogRow = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export type FocusSessionRow = {
  id: string;
  user_id: string;
  session_goal: string;
  duration_min: number;
  subject: string | null;
  sound_used: string | null;
  mood: number | null;
  started_at: string;
  ended_at: string;
  status: 'completed' | 'interrupted';
  focus_accuracy?: 'fully_focused' | 'partially_distracted' | 'off_track' | null;
}

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  subject: string | null;
  chapter: string | null;
  tags: string[];
  is_pinned: boolean;
  next_review: string | null;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export type ScheduleBlockRow = {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  color: string;
  start_time: string;
  end_time: string;
  days: number[];
  specific_date: string | null;
  is_active: boolean;
}

export type SyllabusTopicRow = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  topic: string;
  status: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type StudyRoomRow = {
  id: string;
  name: string;
  subject: string | null;
  host_id: string;
  room_type: string;
  timer_minutes: number;
  is_active: boolean;
  is_public: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export type DailyCheckinRow = {
  id: string;
  user_id: string;
  date: string;
  mood: number;
  energy: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type ScheduleLogRow = {
  id: string;
  user_id: string;
  block_id: string;
  date: string;
  status: string;
  skip_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// --- TABLE INTERFACES ---

export type ProfileTable = {
  Row: ProfileRow;
  Insert: Omit<ProfileRow, 'avatar_url' | 'xp_points' | 'level' | 'is_premium' | 'focus_seeds' | 'unlocked_plants' | 'ai_insight' | 'ai_insight_updated_at' | 'created_at' | 'updated_at'> & {
    avatar_url?: string | null;
    xp_points?: number;
    level?: number;
    is_premium?: boolean;
    focus_seeds?: number;
    unlocked_plants?: string[];
    ai_insight?: string | null;
    ai_insight_updated_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<ProfileRow>;
  Relationships: [];
}

export type GoalTable = {
  Row: GoalRow;
  Insert: Omit<GoalRow, 'id' | 'description' | 'created_at' | 'updated_at'> & {
    id?: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<GoalRow>;
  Relationships: [];
}

export type MilestoneTable = {
  Row: MilestoneRow;
  Insert: Omit<MilestoneRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<MilestoneRow>;
  Relationships: [];
}

export type TaskTable = {
  Row: TaskRow;
  Insert: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<TaskRow>;
  Relationships: [];
}

export type HabitTable = {
  Row: HabitRow;
  Insert: Omit<HabitRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<HabitRow>;
  Relationships: [];
}

export type HabitLogTable = {
  Row: HabitLogRow;
  Insert: Omit<HabitLogRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<HabitLogRow>;
  Relationships: [];
}

export type FocusSessionTable = {
  Row: FocusSessionRow;
  Insert: Omit<FocusSessionRow, 'id'> & {
    id?: string;
  };
  Update: Partial<FocusSessionRow>;
  Relationships: [];
}

export type NoteTable = {
  Row: NoteRow;
  Insert: Omit<NoteRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<NoteRow>;
  Relationships: [];
}

export type ScheduleBlockTable = {
  Row: ScheduleBlockRow;
  Insert: Omit<ScheduleBlockRow, 'id'> & {
    id?: string;
  };
  Update: Partial<ScheduleBlockRow>;
  Relationships: [];
}

export type SyllabusTopicTable = {
  Row: SyllabusTopicRow;
  Insert: Omit<SyllabusTopicRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<SyllabusTopicRow>;
  Relationships: [];
}

export type StudyRoomTable = {
  Row: StudyRoomRow;
  Insert: Omit<StudyRoomRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<StudyRoomRow>;
  Relationships: [];
}

export type DailyCheckinTable = {
  Row: DailyCheckinRow;
  Insert: Omit<DailyCheckinRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<DailyCheckinRow>;
  Relationships: [];
}

export type ScheduleLogTable = {
  Row: ScheduleLogRow;
  Insert: Omit<ScheduleLogRow, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<ScheduleLogRow>;
  Relationships: [];
}

/**
 * Generic schema types definition for Supabase client.
 * Provides custom typings for relational database mapping.
 */
export type Database = {
  public: {
    Tables: {
      profiles: ProfileTable;
      goals: GoalTable;
      milestones: MilestoneTable;
      tasks: TaskTable;
      habits: HabitTable;
      habit_logs: HabitLogTable;
      focus_sessions: FocusSessionTable;
      notes: NoteTable;
      schedule_blocks: ScheduleBlockTable;
      syllabus_topics: SyllabusTopicTable;
      study_rooms: StudyRoomTable;
      daily_checkins: DailyCheckinTable;
      schedule_logs: ScheduleLogTable;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your .env file.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-app-version': Constants.expoConfig?.version ?? '1.0.0',
      },
      // Custom fetch with timeout
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          15000  // 15 second timeout
        );
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    },
  }
);
