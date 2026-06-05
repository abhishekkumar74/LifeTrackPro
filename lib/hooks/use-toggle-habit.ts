import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';
import { useUiStore } from '@/lib/store/ui.store';

interface ToggleHabitParams {
  habitId: string;
  date: string;
  completedToday: boolean;
  onOptimisticUpdate: (newValue: boolean) => void;
}

export function useToggleHabit() {
  const toggleHabit = async ({
    habitId,
    date,
    completedToday,
    onOptimisticUpdate,
  }: ToggleHabitParams) => {
    // 1. Optimistic Update (Flip instantly in the UI)
    const newCompletedState = !completedToday;
    onOptimisticUpdate(newCompletedState);

    // 2. Trigger Haptics
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Fail silently on simulators or unsupported devices
    }

    // 3. Sync to Supabase habit_logs table
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Upsert habit log record
      const { error } = await supabase
        .from('habit_logs')
        .upsert(
          {
            habit_id: habitId,
            user_id: session.user.id,
            date: date,
            done: newCompletedState,
          },
          {
            onConflict: 'habit_id,date',
          }
        );

      if (error) {
        throw error;
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Failed to sync habit toggle:', err);
      }

      // Rollback optimistic state change
      onOptimisticUpdate(completedToday);

      // Show toast error message
      useUiStore.getState().showToast('Failed to update habit', 'error');
    }
  };

  return { toggleHabit };
}
