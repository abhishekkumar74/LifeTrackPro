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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { useActiveRooms, useMyRooms, useEndRoom, RoomWithHost } from '@/lib/hooks/use-study-rooms';
import { LiveBadge } from '@/components/community/LiveBadge';
import { RoomCard } from '@/components/community/RoomCard';
import { CreateRoomSheet } from '@/components/community/CreateRoomSheet';
import { useAuthStore } from '@/lib/store/auth.store';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useAndroidBackHandler } from '@/lib/hooks/use-android-back';
import { Skeleton } from '@/components/shared/Skeleton';

export default function RoomsScreen(): React.JSX.Element {
  useAndroidBackHandler();
  const { profile } = useAuthStore();
  const currentUserId = profile?.id || '';

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

  const [activeTab, setActiveTab] = useState<'live' | 'my'>('live');
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'silent' | 'music' | 'discussion'>('all');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'live') {
      await refetchActive();
    } else {
      await refetchMy();
    }
    setIsRefreshing(false);
  };

  const handleJoinRoom = useCallback((roomId: string) => {
    router.push(`/rooms/${roomId}` as Href);
  }, []);

  const handleEndRoom = useCallback((roomId: string) => {
    endRoomMutation.mutate(roomId);
  }, [endRoomMutation]);

  const totalStudying = activeRooms?.reduce((sum, r) => sum + r.member_count, 0) || 0;

  const renderActiveEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🌙</Text>
      <Text style={styles.emptyTitle}>No rooms live right now</Text>
      <Text style={styles.emptySubtitle}>Be the first to start a session!</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setIsSheetVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Create Room</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMyEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🎓</Text>
      <Text style={styles.emptyTitle}>You haven't created any rooms yet</Text>
      <Text style={styles.emptySubtitle}>Start your first study group to invite others.</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setIsSheetVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Create your first study room →</Text>
      </TouchableOpacity>
    </View>
  );
  const renderRoomRow = useCallback(({ item }: { item: RoomWithHost }) => {
    const isInactiveInMyTab = activeTab === 'my' && !item.is_active;
    return (
      <View style={isInactiveInMyTab && styles.inactiveRoomWrapper}>
        <RoomCard
          room={item}
          currentUserId={currentUserId}
          onJoin={handleJoinRoom}
          onEnd={handleEndRoom}
        />
      </View>
    );
  }, [activeTab, currentUserId, handleJoinRoom, handleEndRoom]);
  const isLoading = activeTab === 'live' ? isActiveLoading : isMyLoading;
  const error = activeTab === 'live' ? activeError : myError;

  const filteredActiveRooms = React.useMemo(() => {
    return activeRooms?.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.subject && room.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || room.room_type === selectedCategory;

      return matchesSearch && matchesCategory;
    }) || [];
  }, [activeRooms, searchQuery, selectedCategory]);

  const listData = activeTab === 'live' ? filteredActiveRooms : myRooms;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#17172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Study Rooms</Text>
        </View>

        <TouchableOpacity
          style={styles.createTriggerButton}
          onPress={() => setIsSheetVisible(true)}
          activeOpacity={0.8}
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
            placeholder="Search rooms or subjects..."
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
              { id: 'all', label: 'All 🌐' },
              { id: 'silent', label: 'Silent 🔇' },
              { id: 'music', label: 'Music 🎵' },
              { id: 'discussion', label: 'Discussion 💬' },
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
          contentContainerStyle={styles.listContent}
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

      {/* CREATE SHEET */}
      <CreateRoomSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onCreated={(newRoomId) => {
          setIsSheetVisible(false);
          router.push(`/rooms/${newRoomId}` as Href);
        }}
      />
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
    fontFamily: 'InstrumentSerif',
    fontSize: 30,
    color: '#17172A',
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
