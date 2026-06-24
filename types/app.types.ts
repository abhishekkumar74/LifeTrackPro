/**
 * Domain-level TypeScript interfaces and enums for LifeTrack Pro.
 * Provides complete compile-time type safety across database responses and UI bindings.
 */

// --- ENUMS ---

export type UserCategory = 'student' | 'cse_student' | 'employee' | 'creator' | 'entrepreneur' | 'educator' | 'aspirant';

export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned';

export type TaskPriority = 'urgent' | 'important' | 'normal';

export type SyllabusStatus = 'not_started' | 'in_progress' | 'done' | 'needs_revision';

export type RoomType = 'silent' | 'music' | 'discussion';

// --- DATA MODEL INTERFACES ---

export interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  category: UserCategory;
  sub_category: string[];
  daily_hours: number;
  peak_time: 'morning' | 'afternoon' | 'night';
  xp_points: number;
  level: number;
  ai_insight: string | null;
  ai_insight_updated_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  timeline: '3M' | '6M' | '1Y' | '2Y' | '5Y';
  deadline: string;
  status: GoalStatus;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  status: 'pending' | 'completed';
  order_index: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  milestone_id: string | null;
  title: string;
  subject: string | null;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recur_days: number[] | null; // 0=Sunday, 1=Monday, etc.
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  frequency: 'daily' | 'weekdays' | 'custom';
  custom_days?: number[] | null; // days of the week habit is active
  order_index: number;
  is_active: boolean;
  best_time?: 'morning' | 'afternoon' | 'evening' | null;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  session_goal: string;
  duration_min: number;
  subject: string | null;
  sound_used: string | null;
  mood: number | null; // scale 1-5
  started_at: string;
  ended_at: string;
  status: 'completed' | 'interrupted';
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string; // Serialized editor content (JSON/Plaintext string)
  subject: string | null;
  chapter: string | null;
  tags: string[];
  is_pinned: boolean;
  next_review: string | null; // Spaced repetition target date
  review_count: number;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface SyllabusTopic {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  topic: string;
  status: SyllabusStatus;
  order_index: number;
  created_at: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  subject: string | null;
  host_id: string;
  room_type: RoomType;
  timer_minutes: number;
  is_active: boolean;
  is_public: boolean;
  member_count: number;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  mood: number; // scale 1-5
  energy: number; // scale 1-5
  note: string | null;
  created_at: string;
}

export interface ScheduleBlock {
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
  created_at?: string;
  updated_at?: string;
}

// --- DTOs / VIEW MODELS ---

export interface HomeDashboardStats {
  focusHoursToday: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  currentStreak: number;
}

export interface ScheduleSkipEntry {
  blockId: string;
  date: string;
  reason: 'Sick' | 'Travelling' | 'Other';
}

export interface ScheduleLog {
  id: string;
  user_id: string;
  block_id: string;
  date: string;
  status: 'completed' | 'skipped' | 'missed';
  skip_reason: 'Sick' | 'Travelling' | 'Other' | null;
  created_at?: string;
  updated_at?: string;
}


