import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, JournalEntryRow } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/utils/handle-error';

const VAULT_PIN_KEY = 'secret_journal_vault_pin';

export interface JournalEntry extends JournalEntryRow {}

// 1. Fetch all journal entries for owner
export function useJournalEntries() {
  return useQuery<JournalEntry[]>({
    queryKey: ['journal_entries'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42P01') {
          return [];
        }
        throw error;
      }
      return (data || []) as JournalEntry[];
    },
  });
}

// 2. Fetch single journal entry
export function useJournalEntry(id: string) {
  return useQuery<JournalEntry | null>({
    queryKey: ['journal_entry', id],
    queryFn: async () => {
      if (!id || id === 'new') return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      return data as JournalEntry;
    },
    enabled: !!id && id !== 'new',
  });
}

// 3. Create entry
export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryData: {
      title: string;
      content: string;
      achievements?: string;
      not_to_dos?: string;
      improvements?: string;
      mood?: number | null;
      tags?: string[];
      entry_date?: string;
      time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
      is_locked?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const todayStr = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      let defaultTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'night';
      if (hour >= 5 && hour < 12) defaultTimeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) defaultTimeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 22) defaultTimeOfDay = 'evening';

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: session.user.id,
          title: entryData.title.trim(),
          content: entryData.content.trim(),
          achievements: (entryData.achievements || '').trim(),
          not_to_dos: (entryData.not_to_dos || '').trim(),
          improvements: (entryData.improvements || '').trim(),
          mood: entryData.mood || 3,
          tags: entryData.tags || [],
          entry_date: entryData.entry_date || todayStr,
          time_of_day: entryData.time_of_day || defaultTimeOfDay,
          is_locked: entryData.is_locked ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'create_journal_entry');
    },
  });
}

// 4. Update entry
export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      content?: string;
      achievements?: string;
      not_to_dos?: string;
      improvements?: string;
      mood?: number | null;
      tags?: string[];
      entry_date?: string;
      time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
      is_locked?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as JournalEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entry', data.id] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'update_journal_entry');
    },
  });
}

// 5. Delete entry
export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.removeQueries({ queryKey: ['journal_entry', id] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'delete_journal_entry');
    },
  });
}

// 6. Vault PIN Management Hook
export function useVaultPin() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkPinStatus = useCallback(async () => {
    try {
      setLoading(true);
      const storedPin = await AsyncStorage.getItem(VAULT_PIN_KEY);
      setHasPin(!!storedPin && storedPin.length === 4);
    } catch (e) {
      if (__DEV__) console.warn('Failed to check vault pin:', e);
      setHasPin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  const savePin = async (newPin: string): Promise<boolean> => {
    if (!newPin || newPin.length !== 4) return false;
    try {
      await AsyncStorage.setItem(VAULT_PIN_KEY, newPin);
      setHasPin(true);
      setIsUnlocked(true);
      return true;
    } catch (e) {
      console.error('Failed to save vault pin:', e);
      return false;
    }
  };

  const verifyPin = async (inputPin: string): Promise<boolean> => {
    try {
      const storedPin = await AsyncStorage.getItem(VAULT_PIN_KEY);
      if (storedPin === inputPin) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to verify vault pin:', e);
      return false;
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
  };

  const resetPin = async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(VAULT_PIN_KEY);
      setHasPin(false);
      setIsUnlocked(false);
      return true;
    } catch (e) {
      console.error('Failed to reset vault pin:', e);
      return false;
    }
  };

  return {
    hasPin,
    isUnlocked,
    loading,
    savePin,
    verifyPin,
    lockVault,
    resetPin,
    checkPinStatus,
  };
}
