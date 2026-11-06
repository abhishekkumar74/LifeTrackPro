import { useAuthStore } from '@/lib/store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/utils/handle-error';
import { StudyRoom } from '@/types/app.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RoomWithHost extends StudyRoom {
  host_name: string;
  host_avatar: string | null;
}

export interface RoomMember {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  initials: string;
  joinedAt: string;
  currentSubject: string | null;
  isFocusing?: boolean;
  focusTimeLeft?: number;
  checkinGoal?: string | null;
  lastCheckinNote?: string | null;
  checkinTime?: string | null;
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
export function useActiveRooms(options?: { refetchInterval?: number }) {
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

      const now = Date.now();
      const expiredRoomIds: string[] = [];

      const unexpired = ((data as unknown as RoomDbRow[]) || []).filter((r) => {
        if (!r.created_at || !r.timer_minutes) return true;
        const createdAt = new Date(r.created_at).getTime();
        const expiresAt = createdAt + r.timer_minutes * 60 * 1000;
        if (now >= expiresAt) {
          expiredRoomIds.push(r.id);
          return false;
        }
        return true;
      });

      if (expiredRoomIds.length > 0) {
        Promise.resolve(
          supabase
            .from('study_rooms')
            .update({ is_active: false })
            .in('id', expiredRoomIds)
        ).catch(() => {});
      }

      return unexpired.map((r) => ({
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
        co_host_ids: (r as any).co_host_ids || [],
        banned_user_ids: (r as any).banned_user_ids || [],
      }));
    },
    refetchInterval: options?.refetchInterval ?? 30000,
  });
}

// 2. useRoomPresence
export function useRoomPresence(roomId: string) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const { profile } = useAuthStore();
  const channelRef = useRef<any>(null);
  const currentPresenceData = useRef<Partial<RoomMember>>({});

  useEffect(() => {
    if (!profile) return;

    const topic = `room_presence:${roomId}`;
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase.channel(topic, {
      config: {
        presence: {
          key: profile.id,
        },
        broadcast: {
          self: true,
        },
      },
    });

    channelRef.current = channel;

    const handleSync = () => {
      const state = channel.presenceState();
      const rawList = Object.values(state).flat();

      const memberMap = new Map<string, RoomMember>();
      for (const p of rawList) {
        const item = p as any;
        if (item?.userId && !memberMap.has(item.userId)) {
          memberMap.set(item.userId, {
            userId: item.userId,
            name: item.name || 'Member',
            avatarUrl: item.avatarUrl || null,
            initials: item.initials || (item.name ? item.name[0].toUpperCase() : 'M'),
            joinedAt: item.joinedAt || new Date().toISOString(),
            currentSubject: item.currentSubject || null,
            isFocusing: item.isFocusing || false,
            focusTimeLeft: item.focusTimeLeft || 0,
            checkinGoal: item.checkinGoal || null,
            lastCheckinNote: item.lastCheckinNote || null,
            checkinTime: item.checkinTime || null,
          });
        }
      }

      setMembers(Array.from(memberMap.values()));
    };

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .on('broadcast', { event: 'kick_member' }, async (eventPayload) => {
        const targetUserId = eventPayload?.payload?.targetUserId;
        if (targetUserId === profile.id) {
          try {
            await AsyncStorage.setItem(`@lifetrack_banned_room_${roomId}`, 'true');
            channel.untrack().catch(() => {});
            supabase.removeChannel(channel).catch(() => {});
          } catch (e) {}
        }
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          const initialPayload = {
            userId: profile.id,
            name: profile.name,
            avatarUrl: profile.avatar_url || null,
            initials: profile.name[0] ? profile.name[0].toUpperCase() : 'U',
            joinedAt: new Date().toISOString(),
            currentSubject: null,
            isFocusing: false,
            focusTimeLeft: 0,
            checkinGoal: null,
            lastCheckinNote: null,
            checkinTime: null,
            ...currentPresenceData.current,
          };
          currentPresenceData.current = initialPayload;
          await channel.track(initialPayload);
        }
        if (status === 'CHANNEL_ERROR') {
          handleSupabaseError(err || new Error('Presence channel error'), 'room_presence_channel');
        }
      });

    return () => {
      supabase.removeChannel(channel).catch((e) => {
        if (__DEV__) console.warn('Presence cleanup error:', e);
      });
      channelRef.current = null;
    };
  }, [roomId, profile]);

  const updatePresenceStatus = useCallback(
    async (updates: Partial<RoomMember>) => {
      if (!profile || !channelRef.current) return;
      const newPayload = {
        ...currentPresenceData.current,
        ...updates,
        userId: profile.id,
        name: profile.name,
        avatarUrl: profile.avatar_url || null,
        initials: profile.name[0] ? profile.name[0].toUpperCase() : 'U',
      };
      currentPresenceData.current = newPayload;
      await channelRef.current.track(newPayload);
    },
    [profile]
  );

  const leaveRoom = useCallback(async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.untrack();
        await supabase.removeChannel(channelRef.current);
      } catch (e) {}
      channelRef.current = null;
    }
  }, []);

  const broadcastKick = useCallback((targetUserId: string, reason?: string) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'kick_member',
          payload: { targetUserId, reason },
        });
      } catch (e) {}
    }
  }, []);

  return {
    members,
    memberCount: members.length,
    updatePresenceStatus,
    leaveRoom,
    broadcastKick,
  };
}

// Helper to resolve user ID reliably on both iOS & Android
async function getAuthenticatedUserId(): Promise<string | null> {
  const storeUser = useAuthStore.getState().user?.id || useAuthStore.getState().profile?.id;
  if (storeUser) return storeUser;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) return sessionData.session.user.id;

    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) return userData.user.id;
  } catch (e) {
    if (__DEV__) console.warn('Error resolving authenticated user ID:', e);
  }
  return null;
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
      const userId = await getAuthenticatedUserId();
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          name: roomData.name,
          subject: roomData.subject,
          host_id: userId,
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
      if (!roomId) throw new Error('Room ID is required');

      const userId = await getAuthenticatedUserId();
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;

      // Storage Optimization: Purge chat messages when room ends
      try {
        await supabase
          .from('room_messages')
          .delete()
          .eq('room_id', roomId);
      } catch {
        // ignore
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRooms'] });
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
      queryClient.invalidateQueries({ queryKey: ['room'] });
    },
    onError: (err) => {
      handleSupabaseError(err, 'end_room');
    },
  });
}

// 4.1 useToggleCoHost
export function useToggleCoHost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      targetUserId,
      isCurrentlyCoHost,
    }: {
      roomId: string;
      targetUserId: string;
      isCurrentlyCoHost: boolean;
    }) => {
      try {
        const { data: currentRoom, error: fetchErr } = await supabase
          .from('study_rooms')
          .select('co_host_ids')
          .eq('id', roomId)
          .single();

        if (fetchErr) {
          if ((fetchErr as any)?.code === '42703' || fetchErr.message?.includes('does not exist')) {
            return null; // DB column not yet added to Supabase; handled via Realtime
          }
          throw fetchErr;
        }

        const existingCoHosts: string[] = (currentRoom as any)?.co_host_ids || [];
        const updatedCoHosts = isCurrentlyCoHost
          ? existingCoHosts.filter((id) => id !== targetUserId)
          : Array.from(new Set([...existingCoHosts, targetUserId]));

        const { data, error } = await supabase
          .from('study_rooms')
          .update({ co_host_ids: updatedCoHosts })
          .eq('id', roomId);

        if (error) {
          if ((error as any)?.code === '42703' || error.message?.includes('does not exist')) {
            return null;
          }
          throw error;
        }
        return data;
      } catch (err: any) {
        if (err?.code === '42703' || err?.message?.includes('does not exist')) {
          return null;
        }
        if (__DEV__) console.warn('toggleCoHost error:', err);
        return null;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['room', vars.roomId] });
      queryClient.invalidateQueries({ queryKey: ['activeRooms'] });
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    },
    onError: (err: any) => {
      if (__DEV__) console.warn('useToggleCoHost onError:', err);
    },
  });
}

// 4.2 useKickMember
export function useKickMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      targetUserId,
    }: {
      roomId: string;
      targetUserId: string;
    }) => {
      try {
        const { data: currentRoom, error: fetchErr } = await supabase
          .from('study_rooms')
          .select('banned_user_ids, co_host_ids')
          .eq('id', roomId)
          .single();

        if (fetchErr) {
          if ((fetchErr as any)?.code === '42703' || fetchErr.message?.includes('does not exist')) {
            return null;
          }
          throw fetchErr;
        }

        const existingBanned: string[] = (currentRoom as any)?.banned_user_ids || [];
        const existingCoHosts: string[] = (currentRoom as any)?.co_host_ids || [];

        const updatedBanned = Array.from(new Set([...existingBanned, targetUserId]));
        const updatedCoHosts = existingCoHosts.filter((id) => id !== targetUserId);

        const { data, error } = await supabase
          .from('study_rooms')
          .update({
            banned_user_ids: updatedBanned,
            co_host_ids: updatedCoHosts,
          })
          .eq('id', roomId);

        if (error) {
          if ((error as any)?.code === '42703' || error.message?.includes('does not exist')) {
            return null;
          }
          throw error;
        }
        return data;
      } catch (err: any) {
        if (err?.code === '42703' || err?.message?.includes('does not exist')) {
          return null;
        }
        if (__DEV__) console.warn('kickMember error:', err);
        return null;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['room', vars.roomId] });
      queryClient.invalidateQueries({ queryKey: ['activeRooms'] });
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    },
    onError: (err: any) => {
      if (__DEV__) console.warn('useKickMember onError:', err);
    },
  });
}

// 6. useMyRooms
export function useMyRooms() {
  return useQuery<RoomWithHost[]>({
    queryKey: ['myRooms'],
    queryFn: async () => {
      const userId = await getAuthenticatedUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles:host_id (
            name,
            avatar_url
          )
        `)
        .eq('host_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = Date.now();
      const expiredRoomIds: string[] = [];

      const unexpired = ((data as unknown as RoomDbRow[]) || []).filter((r) => {
        if (!r.created_at || !r.timer_minutes) return true;
        const createdAt = new Date(r.created_at).getTime();
        const expiresAt = createdAt + r.timer_minutes * 60 * 1000;
        if (now >= expiresAt) {
          expiredRoomIds.push(r.id);
          return false;
        }
        return true;
      });

      if (expiredRoomIds.length > 0) {
        Promise.resolve(
          supabase
            .from('study_rooms')
            .update({ is_active: false })
            .in('id', expiredRoomIds)
        ).catch(() => {});
      }

      return unexpired.map((r) => ({
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
        co_host_ids: (r as any).co_host_ids || [],
        banned_user_ids: (r as any).banned_user_ids || [],
      }));
    },
  });
}

// 5. useRoomChat
export function useRoomChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bannedUserIds, setBannedUserIds] = useState<string[]>([]);
  const [coHostIds, setCoHostIds] = useState<string[]>([]);
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
          .limit(200);

        if (error) {
          if (__DEV__) console.warn('Failed to load room messages:', error);
        } else if (data && isMounted) {
          const formatted: ChatMessage[] = [];
          const initialBanned: string[] = [];
          const initialCoHosts: string[] = [];

          for (const msg of data) {
            const text = msg.text || '';
            // Parse hidden system events for real-time ban & co-host persistence across devices
            if (text.startsWith('__SYS_EVENT__:BAN:')) {
              const bId = text.replace('__SYS_EVENT__:BAN:', '').trim();
              if (bId && !initialBanned.includes(bId)) {
                initialBanned.push(bId);
              }
              continue;
            }
            if (text.startsWith('__SYS_EVENT__:COHOST_ADD:')) {
              const cId = text.replace('__SYS_EVENT__:COHOST_ADD:', '').trim();
              if (cId && !initialCoHosts.includes(cId)) {
                initialCoHosts.push(cId);
              }
              continue;
            }
            if (text.startsWith('__SYS_EVENT__:COHOST_REMOVE:')) {
              const cId = text.replace('__SYS_EVENT__:COHOST_REMOVE:', '').trim();
              const idx = initialCoHosts.indexOf(cId);
              if (idx !== -1) {
                initialCoHosts.splice(idx, 1);
              }
              continue;
            }

            formatted.push({
              id: msg.id,
              userId: msg.user_id,
              userName: msg.user_name,
              userInitials: msg.user_initials,
              userAvatar: msg.user_avatar || null,
              text: msg.text,
              sentAt: msg.created_at,
            });
          }

          setMessages(formatted);
          if (initialBanned.length > 0) {
            setBannedUserIds(initialBanned);
          }
          if (initialCoHosts.length > 0) {
            setCoHostIds(initialCoHosts);
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('Error in fetchHistory:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();

    // 2. Realtime Postgres Changes Subscription for new room messages (unique channel name per hook instance prevents callback-after-subscribe errors)
    const chatTopic = `room_db_chat:${roomId}:${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const realtimeChannel = supabase
      .channel(chatTopic)
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

          const text = newRow.text || '';
          if (text.startsWith('__SYS_EVENT__:BAN:')) {
            const bId = text.replace('__SYS_EVENT__:BAN:', '').trim();
            if (bId) {
              setBannedUserIds((prev) => Array.from(new Set([...prev, bId])));
            }
            return;
          }
          if (text.startsWith('__SYS_EVENT__:COHOST_ADD:')) {
            const cId = text.replace('__SYS_EVENT__:COHOST_ADD:', '').trim();
            if (cId) {
              setCoHostIds((prev) => Array.from(new Set([...prev, cId])));
            }
            return;
          }
          if (text.startsWith('__SYS_EVENT__:COHOST_REMOVE:')) {
            const cId = text.replace('__SYS_EVENT__:COHOST_REMOVE:', '').trim();
            if (cId) {
              setCoHostIds((prev) => prev.filter((id) => id !== cId));
            }
            return;
          }

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

  const sendSystemEvent = useCallback(
    async (systemText: string) => {
      if (!profile?.id || !roomId) return;
      try {
        await supabase.from('room_messages').insert({
          room_id: roomId,
          user_id: profile.id,
          user_name: 'SYSTEM',
          user_initials: 'SY',
          user_avatar: null,
          text: systemText,
        });
      } catch (e) {
        if (__DEV__) console.warn('Failed to insert system event:', e);
      }
    },
    [roomId, profile?.id]
  );

  const sendMessage = useCallback(async (text: string) => {
    if (!profile?.id) return;

    // 1. Trim and validate not empty
    const trimmed = text.trim();
    if (!trimmed || trimmed.length === 0) return;

    // 2. Max length
    if (trimmed.length > 200) return;

    // 3. Block URLs (prevent phishing)
    const urlPattern = /https?:\/\/|www\.|\.com|\.in|\.net|\.org/i;
    if (urlPattern.test(trimmed)) {
      return; // Silently reject
    }

    // 4. Rate limiting (client-side)
    const now = Date.now();
    if (now - lastMessageTime.current < 800) {
      return; // Max 1 message per 800ms
    }
    lastMessageTime.current = now;

    // 5. Sanitize: remove any HTML-like chars
    const sanitized = trimmed.replace(/[<>]/g, '').trim();
    if (!sanitized) return;

    const currentUserId = profile.id;
    const userInitials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';

    const optimisticId = 'temp_' + Math.random().toString(36).substring(2, 9);
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      userId: currentUserId,
      userName: profile.name || 'Anonymous User',
      userInitials,
      userAvatar: profile.avatar_url || null,
      text: sanitized,
      sentAt: new Date().toISOString(),
    };

    // Optimistically add to UI immediately (0ms instant response)
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Insert into Supabase table (persists permanently & triggers postgres_changes for all users)
      const { data, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: currentUserId,
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
  }, [roomId, profile]);

  return {
    messages,
    isLoading,
    sendMessage,
    sendSystemEvent,
    bannedUserIds,
    coHostIds,
  };
}
