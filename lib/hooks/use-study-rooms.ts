import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StudyRoom } from '@/types/app.types';
import { useAuthStore } from '@/lib/store/auth.store';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useUiStore } from '@/lib/store/ui.store';
import { handleSupabaseError } from '@/lib/utils/handle-error';

export interface RoomWithHost extends StudyRoom {
  host_name: string;
  host_avatar: string | null;
}

export interface RoomMember {
  userId: string;
  name: string;
  initials: string;
  joinedAt: string;
  currentSubject: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userAvatar?: string | null;
  text: string;
  sentAt: string;
}

interface RoomDbRow extends StudyRoom {
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
}

// 1. useActiveRooms
export function useActiveRooms() {
  return useQuery<RoomWithHost[]>({
    queryKey: ['activeRooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles:host_id (
            name,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data as unknown as RoomDbRow[]) || []).map((r) => ({
        id: r.id,
        name: r.name,
        subject: r.subject,
        host_id: r.host_id,
        host_name: r.profiles?.name || 'Unknown Host',
        host_avatar: r.profiles?.avatar_url || null,
        room_type: r.room_type as 'silent' | 'music' | 'discussion',
        timer_minutes: r.timer_minutes,
        is_active: r.is_active,
        is_public: r.is_public,
        member_count: r.member_count,
        created_at: r.created_at,
      }));
    },
  });
}

// 2. useRoomPresence
export function useRoomPresence(roomId: string) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel(`room_presence:${roomId}`, {
      config: {
        presence: {
          key: profile.id,
        },
        broadcast: {
          self: true,
        },
      },
    });

    const handleSync = () => {
      const state = channel.presenceState();
      const presenceMembers: RoomMember[] = Object.values(state)
        .flat()
        .map((p: any) => ({
          userId: (p as RoomMember).userId,
          name: (p as RoomMember).name,
          initials: (p as RoomMember).initials,
          joinedAt: (p as RoomMember).joinedAt,
          currentSubject: (p as RoomMember).currentSubject,
        }));
      setMembers(presenceMembers);
    };

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: profile.id,
            name: profile.name,
            initials: profile.name[0] ? profile.name[0].toUpperCase() : 'U',
            joinedAt: new Date().toISOString(),
            currentSubject: null,
          });
        }
        if (status === 'CHANNEL_ERROR') {
          handleSupabaseError(err || new Error('Presence channel error'), 'room_presence_channel');
        }
      });

    return () => {
      supabase.removeChannel(channel).catch((e) => {
        if (__DEV__) console.warn('Presence cleanup error:', e);
      });
    };
  }, [roomId, profile]);

  return {
    members,
    memberCount: members.length,
  };
}

// 3. useCreateRoom
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomData: {
      name: string;
      subject: string | null;
      room_type: 'silent' | 'music' | 'discussion';
      timer_minutes: number;
      is_public: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          name: roomData.name,
          subject: roomData.subject,
          host_id: session.user.id,
          room_type: roomData.room_type,
          timer_minutes: roomData.timer_minutes,
          is_active: true,
          is_public: roomData.is_public,
          member_count: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StudyRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRooms'] });
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'create_room');
    },
  });
}

// 4. useEndRoom
export function useEndRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .update({ is_active: false })
        .eq('id', roomId)
        .eq('host_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRooms'] });
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'end_room');
    },
  });
}

// 6. useMyRooms
export function useMyRooms() {
  return useQuery<RoomWithHost[]>({
    queryKey: ['myRooms'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles:host_id (
            name,
            avatar_url
          )
        `)
        .eq('host_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data as unknown as RoomDbRow[]) || []).map((r) => ({
        id: r.id,
        name: r.name,
        subject: r.subject,
        host_id: r.host_id,
        host_name: r.profiles?.name || 'Unknown Host',
        host_avatar: r.profiles?.avatar_url || null,
        room_type: r.room_type as 'silent' | 'music' | 'discussion',
        timer_minutes: r.timer_minutes,
        is_active: r.is_active,
        is_public: r.is_public,
        member_count: r.member_count,
        created_at: r.created_at,
      }));
    },
  });
}

// 5. useRoomChat
export function useRoomChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { profile } = useAuthStore();
  const lastMessageTime = useRef<number>(0);

  // 1. Fetch initial message history from Database & subscribe to Realtime changes
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('room_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          if (__DEV__) console.warn('Failed to load room messages:', error);
        } else if (data && isMounted) {
          const formatted: ChatMessage[] = data.map((msg) => ({
            id: msg.id,
            userId: msg.user_id,
            userName: msg.user_name,
            userInitials: msg.user_initials,
            userAvatar: msg.user_avatar || null,
            text: msg.text,
            sentAt: msg.created_at,
          }));
          setMessages(formatted);
        }
      } catch (err) {
        if (__DEV__) console.warn('Error in fetchHistory:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();

    // 2. Realtime Postgres Changes Subscription for new room messages
    const realtimeChannel = supabase
      .channel(`room_db_chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow) return;

          const newMsg: ChatMessage = {
            id: newRow.id,
            userId: newRow.user_id,
            userName: newRow.user_name,
            userInitials: newRow.user_initials,
            userAvatar: newRow.user_avatar || null,
            text: newRow.text,
            sentAt: newRow.created_at,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const hasTempMatch = prev.some(
              (m) => m.id.startsWith('temp_') && m.userId === newMsg.userId && m.text === newMsg.text
            );

            if (hasTempMatch) {
              return prev.map((m) =>
                m.id.startsWith('temp_') && m.userId === newMsg.userId && m.text === newMsg.text
                  ? newMsg
                  : m
              );
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          if (__DEV__) console.warn('Realtime chat channel error:', err);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(realtimeChannel).catch((e) => {
        if (__DEV__) console.warn('Realtime chat cleanup error:', e);
      });
    };
  }, [roomId]);

  const sendMessage = async (text: string) => {
    if (!profile) return;

    // 1. Must be authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Trim and validate not empty
    const trimmed = text.trim();
    if (!trimmed || trimmed.length === 0) return;

    // 3. Max length
    if (trimmed.length > 200) return;

    // 4. Block URLs (prevent phishing)
    const urlPattern = /https?:\/\/|www\.|\.com|\.in|\.net|\.org/i;
    if (urlPattern.test(trimmed)) {
      return; // Silently reject
    }

    // 5. Rate limiting (client-side)
    const now = Date.now();
    if (now - lastMessageTime.current < 1500) {
      return; // Max 1 message per 1.5 seconds
    }
    lastMessageTime.current = now;

    // 6. Sanitize: remove any HTML-like chars
    const sanitized = trimmed.replace(/[<>]/g, '').trim();
    if (!sanitized) return;

    const userInitials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';

    const optimisticId = 'temp_' + Math.random().toString(36).substring(2, 9);
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      userId: user.id,
      userName: profile.name || 'Anonymous User',
      userInitials,
      userAvatar: profile.avatar_url || null,
      text: sanitized,
      sentAt: new Date().toISOString(),
    };

    // Optimistically add to UI for instantaneous response
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Insert into Supabase table (persists permanently & triggers postgres_changes for all users)
      const { data, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          user_name: profile.name || 'Anonymous User',
          user_initials: userInitials,
          user_avatar: profile.avatar_url || null,
          text: sanitized,
        })
        .select()
        .single();

      if (error) {
        if (__DEV__) console.warn('Failed to insert room message:', error);
      } else if (data) {
        // Replace optimistic message with real DB record ID
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) {
            return prev.filter((m) => m.id !== optimisticId);
          }
          return prev.map((m) =>
            m.id === optimisticId ? { ...m, id: data.id, sentAt: data.created_at } : m
          );
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to send room message:', e);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
