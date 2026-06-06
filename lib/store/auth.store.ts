import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
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
}));

export default useAuthStore;
