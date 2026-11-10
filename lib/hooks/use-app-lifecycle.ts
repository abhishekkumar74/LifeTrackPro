import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useFocusStore, resyncFocusTimer } from '../store/focus.store';
import { showActiveFocusNotification } from '../notifications';
import { FocusLiveActivity } from '../native/live-activity';
import { useNotificationStore } from '../store/notification.store';

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
          
          // Seamlessly show live timer notification when app is minimized
          const focus = useFocusStore.getState();
          if (focus.isRunning || focus.isPaused) {
            showActiveFocusNotification({
              goal: focus.sessionGoal,
              subject: focus.subjectTag,
              activeSound: focus.activeSound,
              secondsLeft: focus.secondsLeft,
              isPaused: focus.isPaused,
              mode: focus.currentMode,
            }).catch(() => {});
            FocusLiveActivity.updateSession(focus.isPaused, focus.secondsLeft, focus.sessionGoal).catch(() => {});
          }

          if (__DEV__) {
            console.log('App → background (Active focus notification refreshed)');
          }
        }

        // App came back to FOREGROUND
        if (
          appState.current !== 'active' &&
          nextState === 'active'
        ) {
          const bgDuration = Date.now() - backgroundTime.current;

          // Refresh daily notification nudges on return to foreground
          useNotificationStore.getState().refreshDailyNudges();

          // Resync running focus timer seamlessly without discarding session
          const focus = useFocusStore.getState();
          if (focus.isRunning) {
            resyncFocusTimer(focus).catch(() => {});
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
