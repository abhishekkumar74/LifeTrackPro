import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';
import { useUiStore } from '@/lib/store/ui.store';
import { getTodayLocal } from '@/lib/utils/date';

export async function toggleHabit(
  habitId: string,
  currentlyDone: boolean,
  onOptimisticUpdate: (done: boolean) => void,
  date?: string
) {
  const newDone = !currentlyDone;
  
  // 1. Optimistic update immediately
  onOptimisticUpdate(newDone);

  // 2. Get user
  const { data: { user }, error: authError } = 
    await supabase.auth.getUser();
  if (!user || authError) {
    // Rollback
    onOptimisticUpdate(currentlyDone);
    if (__DEV__) console.error('No user in toggleHabit');
    return;
  }
  
  const targetDate = date || getTodayLocal();
  
  // 3. Haptic feedback
  await Haptics.impactAsync(
    Haptics.ImpactFeedbackStyle.Light
  ).catch(() => {});
  
  // 4. Upsert to database
  const { error } = await supabase
    .from('habit_logs')
    .upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        date: targetDate,
        done: newDone,
      },
      { onConflict: 'habit_id,date' }
    );
  
  // 5. Rollback on error
  if (error) {
    onOptimisticUpdate(currentlyDone); // revert
    useUiStore.getState().showToast(
      'Could not update habit. Try again.',
      'error'
    );
    if (__DEV__) console.error('Habit toggle error:', error);
  }
}

interface ToggleHabitParams {
  habitId: string;
  date?: string;
  completedToday: boolean;
  onOptimisticUpdate: (newValue: boolean) => void;
}

export function useToggleHabit() {
  const toggle = async ({
    habitId,
    date,
    completedToday,
    onOptimisticUpdate,
  }: ToggleHabitParams) => {
    await toggleHabit(habitId, completedToday, onOptimisticUpdate, date);
  };

  return { toggleHabit: toggle };
}

