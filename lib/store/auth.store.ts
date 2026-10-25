import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/app.types';
import { supabase } from '@/lib/supabase/client';
import { queryClient } from '@/lib/query-client';
import { resetUser } from '@/lib/posthog';
import { clearSentryUser } from '@/lib/sentry';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  deductXp: (amount: number) => boolean;
  setLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      setSession: (session) =>
        set({
          session,
          user: session ? session.user : null,
        }),
      setProfile: (incomingProfile) =>
        set((state) => {
          if (!incomingProfile) return { profile: null };
          if (!state.profile) return { profile: incomingProfile };

          // Defensive Protection: Never allow XP, Level, or Focus Seeds to decrease
          // due to stale network cache, offline mode, or subscription status changes
          const safeXp = Math.max(Number(state.profile.xp_points || 0), Number(incomingProfile.xp_points || 0));
          const safeLevel = Math.max(Number(state.profile.level || 1), Number(incomingProfile.level || 1));
          const safeSeeds = Math.max(Number(state.profile.focus_seeds || 0), Number(incomingProfile.focus_seeds || 0));

          return {
            profile: {
              ...state.profile,
              ...incomingProfile,
              xp_points: safeXp,
              level: safeLevel,
              focus_seeds: safeSeeds,
            },
          };
        }),
      deductXp: (amount: number) => {
        let success = false;
        set((state) => {
          if (!state.profile) return state;
          const currentXp = Number(state.profile.xp_points || 0);
          if (currentXp < amount) return state;
          success = true;
          const newXp = currentXp - amount;
          return {
            profile: {
              ...state.profile,
              xp_points: newXp,
              focus_seeds: newXp,
            },
          };
        });
        return success;
      },
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () =>
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
        }),
      signOut: async () => {
        try {
          resetUser();
          clearSentryUser();
        } catch (e) {
          if (__DEV__) console.warn('[AuthStore] resetUser error:', e);
        }

        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          if (GoogleSignin) {
            await GoogleSignin.signOut().catch(() => {});
          }
        } catch {}

        try {
          await supabase.auth.signOut();
        } catch (err) {
          if (__DEV__) console.warn('[AuthStore] supabase.auth.signOut warning:', err);
        }

        // CRITICAL: Always clear cached queries and auth state regardless of network/API errors
        try {
          queryClient.clear();
        } catch {}

        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
        });

        try {
          await AsyncStorage.removeItem('lifetrack-auth-store');
        } catch {}
      },
    }),
    {
      name: 'lifetrack-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
      }),
    }
  )
);

export default useAuthStore;
