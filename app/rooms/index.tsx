import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';
import { router, Href, useLocalSearchParams } from 'expo-router';
import { useActiveRooms, useMyRooms, useEndRoom, RoomWithHost } from '@/lib/hooks/use-study-rooms';
import { LiveBadge } from '@/components/community/LiveBadge';
import { RoomCard } from '@/components/community/RoomCard';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUiStore } from '@/lib/store/ui.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Plus, Moon, Users } from 'lucide-react-native';
import { Skeleton } from '@/components/shared/Skeleton';
import { parseRoomSubject } from '@/lib/utils/room-visibility';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';

export default function RoomsScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const { profile } = useAuthStore();
  const currentUserId = profile?.id || '';
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const {
    data: activeRooms,
    isLoading: isActiveLoading,
    error: activeError,
    refetch: refetchActive,
  } = useActiveRooms();

  const {
    data: myRooms,
    isLoading: isMyLoading,
    error: myError,
    refetch: refetchMy,
  } = useMyRooms();

  const endRoomMutation = useEndRoom();
  const { mutate: endRoom } = endRoomMutation;

  const [activeTab, setActiveTab] = useState<'live' | 'my'>(tab === 'my' ? 'my' : 'live');

  React.useEffect(() => {
    if (tab === 'my' || tab === 'live') {
      setActiveTab(tab);
    }
  }, [tab]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'silent' | 'music' | 'discussion'>('all');

  const handleOpenCreateRoom = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    router.push('/rooms/create' as Href);
  }, []);

  const handleBack = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as Href);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'live') {
      await refetchActive();
    } else {
      await refetchMy();
    }
    setIsRefreshing(false);
  };

  // Combine user's own active rooms with public active rooms
  const allLiveRooms = React.useMemo(() => {
    const roomMap = new Map<string, RoomWithHost>();
    const now = Date.now();

    // 1. Include user's own active rooms so host can easily manage them in Live Rooms
    if (myRooms) {
      for (const r of myRooms) {
        if (!r.is_active) continue;
        const createdAt = new Date(r.created_at).getTime();
        const durationMs = (r.timer_minutes || 25) * 60 * 1000;
        if (now < createdAt + durationMs) {
          roomMap.set(r.id, r);
        }
      }
    }

    // 2. Include public active rooms
    if (activeRooms) {
      for (const r of activeRooms) {
        if (!r.is_active || roomMap.has(r.id)) continue;
        const createdAt = new Date(r.created_at).getTime();
        const durationMs = (r.timer_minutes || 25) * 60 * 1000;
        if (now < createdAt + durationMs) {
          roomMap.set(r.id, r);
        }
      }
    }

    return Array.from(roomMap.values());
  }, [activeRooms, myRooms]);

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      // 1. Check local device ban cache for this room
      try {
        const locallyBanned = await AsyncStorage.getItem(`@lifetrack_banned_room_${roomId}`);
        if (locallyBanned === 'true') {
          useUiStore.getState().showToast('Access denied: You were removed from this room by the host.', 'error');
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch (e) {}
          return;
        }
      } catch (e) {}

      // 2. Check if current user is in room's banned_user_ids
      const selectedRoom = allLiveRooms.find((r) => r.id === roomId);
      if (selectedRoom?.banned_user_ids && currentUserId && selectedRoom.banned_user_ids.includes(currentUserId)) {
        useUiStore.getState().showToast('Access denied: You were removed from this room by the host.', 'error');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {}
        return;
      }

      router.push(`/rooms/${roomId}` as Href);
    },
    [allLiveRooms, currentUserId]
  );

  const handleEndRoom = useCallback((roomId: string) => {
    endRoom(roomId);
  }, [endRoom]);

  const totalStudying = React.useMemo(() => {
    return allLiveRooms.reduce((sum, r) => sum + Math.max(r.member_count || 1, 1), 0);
  }, [allLiveRooms]);

  const renderActiveEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Moon size={28} color="#5B4FE8" strokeWidth={2} />
      </View>
      <Text style={styles.emptyTitle}>No rooms live right now</Text>
      <Text style={styles.emptySubtitle}>Be the first to start a session!</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleOpenCreateRoom}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Create Room</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMyEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Users size={28} color="#5B4FE8" strokeWidth={2} />
      </View>
      <Text style={styles.emptyTitle}>You haven't created any rooms yet</Text>
      <Text style={styles.emptySubtitle}>Start your first study group to invite others.</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleOpenCreateRoom}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Create your first study room</Text>
      </TouchableOpacity>
    </View>
  );
  const renderRoomRow = useCallback(({ item }: { item: RoomWithHost }) => {
    return (
      <RoomCard
        room={item}
        currentUserId={currentUserId}
        onJoin={handleJoinRoom}
        onEnd={handleEndRoom}
      />
    );
  }, [currentUserId, handleJoinRoom, handleEndRoom]);
  const isLoading = activeTab === 'live' ? isActiveLoading : isMyLoading;
  const error = activeTab === 'live' ? activeError : myError;

  const filteredActiveRooms = React.useMemo(() => {
    return allLiveRooms.filter((room) => {
      // Exclude rooms whose timers have expired
      const createdAt = new Date(room.created_at).getTime();
      const durationMs = (room.timer_minutes || 60) * 60 * 1000;
      const expiresAt = createdAt + durationMs;
      if (Date.now() > expiresAt) {
        return false;
      }

      const cleanSearch = searchQuery.trim().toLowerCase().replace('#', '');
      const cleanId = room.id.replace(/-/g, '').toLowerCase();
      const shortCode = cleanId.slice(0, 6);

      const parsed = parseRoomSubject(room.subject, room.is_public);
      const subjectText = (parsed.displaySubject || '').toLowerCase();

      const matchesSearch =
        room.name.toLowerCase().includes(cleanSearch) ||
        subjectText.includes(cleanSearch) ||
        room.id.toLowerCase().includes(cleanSearch) ||
        shortCode.includes(cleanSearch) ||
        cleanId.startsWith(cleanSearch);

      const matchesCategory =
        selectedCategory === 'all' || room.room_type === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allLiveRooms, searchQuery, selectedCategory]);

  const sortedMyRooms = React.useMemo(() => {
    if (!myRooms) return [];
    return [...myRooms].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [myRooms]);

  const listData = activeTab === 'live' ? filteredActiveRooms : sortedMyRooms;

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" translucent={false} />
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#17172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Study Rooms</Text>
        </View>

        <TouchableOpacity
          style={styles.createTriggerButton}
          onPress={handleOpenCreateRoom}
          activeOpacity={0.8}
          accessibilityLabel="Create study room"
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* LIVE BADGE & STATS */}
      <View style={styles.statsContainer}>
        <LiveBadge count={totalStudying} />
      </View>

      {/* TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'live' && styles.tabButtonActive]}
          onPress={() => setActiveTab('live')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>
            Live Rooms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my' && styles.tabButtonActive]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            My Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH AND FILTER */}
      {activeTab === 'live' && (
        <View style={styles.searchFilterContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search rooms or enter Room Code (e.g. C87F39)..."
            placeholderTextColor="#9B9BAF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            maxLength={40}
            autoCorrect={false}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollView}
            style={styles.filterContainer}
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'silent', label: 'Silent' },
              { id: 'music', label: 'Music' },
              { id: 'discussion', label: 'Discussion' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch (e) {}
                    setSelectedCategory(cat.id as any);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* CONTENT LIST */}
      {isLoading ? (
        <View style={styles.listContent}>
          <Skeleton width="100%" height={110} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={110} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={110} borderRadius={16} style={{ marginBottom: 12 }} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load study rooms</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderRoomRow}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 30, 40) : 40 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#5B4FE8']}
              tintColor="#5B4FE8"
            />
          }
          ListEmptyComponent={activeTab === 'live' ? renderActiveEmpty : renderMyEmpty}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#17172A',
    letterSpacing: -0.4,
  },
  createTriggerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5B4FE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E8E7E3',
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#5B4FE8',
  },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    color: '#5C5C70',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#E85858',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAE8FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#17172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#9B9BAF',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#EAE8FD',
    borderWidth: 1,
    borderColor: '#5B4FE8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    color: '#5B4FE8',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
  inactiveRoomWrapper: {
    opacity: 0.6,
    position: 'relative',
  },
  searchFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
  },
  filterContainer: {
    flexGrow: 0,
  },
  filterScrollView: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  filterChipActive: {
    backgroundColor: '#5B4FE8',
    borderColor: '#5B4FE8',
  },
  filterChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#5C5C70',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});
