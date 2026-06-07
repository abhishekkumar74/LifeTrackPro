import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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

          // Was in background > 5 minutes?
          if (bgDuration > 5 * 60 * 1000) {
            
            // 1. Refresh auth session
            const { error } = await supabase.auth.refreshSession();
            if (error && __DEV__) {
              console.error(
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
          const focus = useFocusStore.getState();
          if (
            focus.isRunning && 
            focus.sessionStartTimestamp
          ) {
            // Recalculate correct secondsLeft
            // based on wall clock (not tick count)
            const elapsed = Math.floor(
              (Date.now() - focus.sessionStartTimestamp) / 1000
            );
            const correct = Math.max(
              0,
              focus.totalSeconds - elapsed
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
