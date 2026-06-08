import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/app.types';
import { supabase } from '@/lib/supabase/client';
import { queryClient } from '@/lib/query-client';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
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
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () =>
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
        }),
      signOut: async () => {
        await supabase.auth.signOut();
        // CRITICAL: clear all cached data
        queryClient.clear();
        useAuthStore.setState({
          user: null,
          session: null,
          profile: null,
        });
      },
    }),
    {
      name: 'lifetrack-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);

export default useAuthStore;
