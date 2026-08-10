import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useFocusStore } from '../store/focus.store';

export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const appState = useRef<AppStateStatus>(
    AppState.currentState
  );
  const backgroundTime = useRef<number>(0);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        
        // App went to BACKGROUND
        if (
          appState.current === 'active' &&
          nextState === 'background'
        ) {
          backgroundTime.current = Date.now();
          
          if (__DEV__) {
            console.log('App → background');
          }
        }

        // App came back to FOREGROUND
        if (
          appState.current !== 'active' &&
          nextState === 'active'
        ) {
          const bgDuration = Date.now() - backgroundTime.current;

          // Check if focus timer was running and exceeded 2 minutes background grace period
          const focus = useFocusStore.getState();
          if (focus.isRunning && backgroundTime.current > 0 && bgDuration > 120 * 1000) {
            const elapsed = focus.elapsedSeconds;
            if (elapsed >= 300) { // 5 minutes
              const focusMinutes = Math.max(1, Math.floor(elapsed / 60));
              const endedAt = new Date().toISOString();
              const startedAt = new Date(Date.now() - elapsed * 1000).toISOString();

              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  await supabase.from('focus_sessions').insert({
                    user_id: session.user.id,
                    session_goal: focus.sessionGoal.trim() || 'Deep Focus Session',
                    duration_min: focusMinutes,
                    subject: focus.subjectTag,
                    sound_used: focus.activeSound,
                    mood: null,
                    started_at: startedAt,
                    ended_at: endedAt,
                    status: 'interrupted',
                  });
                }
              } catch (err) {
                if (__DEV__) console.warn('Failed to log background interrupted focus session:', err);
              }

              Alert.alert(
                'Focus Session Interrupted',
                'You left the app for more than 2 minutes. The session was logged as Interrupted.'
              );
            } else {
              Alert.alert(
                'Focus Session Discarded',
                'You left the app for more than 2 minutes. The session was discarded since it was under 5 minutes.'
              );
            }

            focus.resetSession();
            queryClient.invalidateQueries({ queryKey: ['stats'] });
          }

          // Was in background > 5 minutes? (Auth & React Query Refresh)
          if (backgroundTime.current > 0 && bgDuration > 5 * 60 * 1000) {
            
            // 1. Refresh auth session
            const { error } = await supabase.auth.refreshSession();
            if (error && __DEV__) {
              console.warn(
                'Session refresh failed:', error
              );
            }

            // 2. Refetch stale data
            // (React Query marks all as stale)
            await queryClient.refetchQueries({
              type: 'active',
              stale: true,
            });

            if (__DEV__) {
              console.log(
                `App → foreground after ${Math.round(bgDuration/1000)}s`
              );
            }
          }

          // 3. Fix timer drift if running
          const currentFocus = useFocusStore.getState();
          if (
            currentFocus.isRunning && 
            currentFocus.sessionStartTimestamp
          ) {
            // Recalculate correct secondsLeft
            // based on wall clock (not tick count)
            const elapsed = Math.floor(
              (Date.now() - currentFocus.sessionStartTimestamp) / 1000
            );
            const correct = Math.max(
              0,
              currentFocus.totalSeconds - elapsed
            );
            useFocusStore.setState({
              secondsLeft: correct
            });
          }
        }

        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [queryClient]);
}
