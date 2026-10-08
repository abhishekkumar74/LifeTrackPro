import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  Flame,
  Brain,
  Trophy,
  CheckCheck,
  Trash2,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  BellOff,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';
import {
  useNotificationStore,
  AppNotification,
  NotificationType,
} from '@/lib/store/notification.store';
import { requestNotificationPermission } from '@/lib/notifications';
import { COLORS } from '@/constants/theme';

type FilterCategory = 'all' | 'brief' | 'streak' | 'revision' | 'milestone';

export default function NotificationsScreen() {
  const {
    notifications,
    settings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updateSetting,
  } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  // Group notifications chronologically: Today, This Week, Earlier
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const todayList = filteredNotifications.filter((n) => now - n.timestamp < oneDay);
  const weekList = filteredNotifications.filter(
    (n) => now - n.timestamp >= oneDay && now - n.timestamp < oneWeek
  );
  const earlierList = filteredNotifications.filter((n) => now - n.timestamp >= oneWeek);

  const handleItemPress = async (item: AppNotification) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    markAsRead(item.id);
    if (item.targetScreen) {
      router.push(item.targetScreen as Href);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAll(),
        },
      ]
    );
  };

  const getItemIcon = (type: NotificationType) => {
    switch (type) {
      case 'brief':
        return <Sparkles size={18} color={COLORS.violet} />;
      case 'streak':
        return <Flame size={18} color={COLORS.amber} fill={COLORS.amber} />;
      case 'revision':
        return <Brain size={18} color={COLORS.violet} />;
      case 'milestone':
        return <Trophy size={18} color={COLORS.violet} />;
      default:
        return <Bell size={18} color={COLORS.violet} />;
    }
  };

  const renderNotificationRow = (item: AppNotification) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        {/* Unread Accent Bar */}
        {!item.isRead && <View style={styles.unreadAccentBar} />}

        {/* Brand Tinted Icon Bubble */}
        <View style={styles.iconBubble}>{getItemIcon(item.type)}</View>

        {/* Card Content */}
        <View style={styles.cardContentCol}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>

          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>

          {item.actionText && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionPillText}>{item.actionText}</Text>
                <ChevronRight size={12} color={COLORS.violet} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delete Item Action */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            deleteNotification(item.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color={COLORS.t3} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color={COLORS.navy} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadgePill}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSub}>LifeTrack Pro Activity & Nudges</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={markAllAsRead}
              activeOpacity={0.7}
              accessibilityLabel="Mark all read"
            >
              <CheckCheck size={18} color={COLORS.violet} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.headerIconBtn, styles.settingsBtnActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSettingsModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Notification settings"
          >
            <SlidersHorizontal size={18} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Category Filters Bar */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'brief', label: 'Briefs', count: notifications.filter((n) => n.type === 'brief').length },
              { id: 'streak', label: 'Streaks', count: notifications.filter((n) => n.type === 'streak').length },
              { id: 'revision', label: 'Revision', count: notifications.filter((n) => n.type === 'revision').length },
              { id: 'milestone', label: 'Milestones', count: notifications.filter((n) => n.type === 'milestone').length },
            ].map((cat) => {
              const isActive = activeFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveFilter(cat.id as FilterCategory);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                  {cat.count > 0 && (
                    <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                        {cat.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notifications Feed */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BellOff size={32} color={COLORS.t3} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'all'
                ? 'No pending notifications right now. Operating at peak focus!'
                : `No ${activeFilter} alerts to display.`}
            </Text>
          </View>
        ) : (
          <View style={styles.feedWrapper}>
            {/* TODAY */}
            {todayList.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeaderTitle}>Today</Text>
                {todayList.map(renderNotificationRow)}
              </View>
            )}

            {/* THIS WEEK */}
            {weekList.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeaderTitle}>This Week</Text>
                {weekList.map(renderNotificationRow)}
              </View>
            )}

            {/* EARLIER */}
            {earlierList.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeaderTitle}>Earlier</Text>
                {earlierList.map(renderNotificationRow)}
              </View>
            )}
          </View>
        )}

        {filteredNotifications.length > 0 && (
          <TouchableOpacity style={styles.clearHistoryBtn} onPress={handleClearAll} activeOpacity={0.7}>
            <Trash2 size={14} color={COLORS.coral} />
            <Text style={styles.clearHistoryText}>Clear Notification History</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Preferences Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalHeaderIcon}>
                  <SlidersHorizontal size={18} color={COLORS.violet} />
                </View>
                <Text style={styles.modalTitle}>Notification Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={18} color={COLORS.t2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.settingItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Daily Morning Brief</Text>
                  <Text style={styles.settingSub}>Schedule daily summary at 8:00 AM</Text>
                </View>
                <Switch
                  value={settings.morningBriefEnabled}
                  onValueChange={(val) => updateSetting('morningBriefEnabled', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.violet }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Streak Saver Alerts 🔥</Text>
                  <Text style={styles.settingSub}>Remind at 9:00 PM before streak breaks</Text>
                </View>
                <Switch
                  value={settings.streakAlertsEnabled}
                  onValueChange={(val) => updateSetting('streakAlertsEnabled', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.violet }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Habit Tracking Nudges</Text>
                  <Text style={styles.settingSub}>Smart afternoon habit check-in reminders</Text>
                </View>
                <Switch
                  value={settings.habitRemindersEnabled}
                  onValueChange={(val) => updateSetting('habitRemindersEnabled', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.violet }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Spaced Repetition Alerts 🧠</Text>
                  <Text style={styles.settingSub}>Optimal memory review interval notifications</Text>
                </View>
                <Switch
                  value={settings.revisionAlertsEnabled}
                  onValueChange={(val) => updateSetting('revisionAlertsEnabled', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.violet }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Quiet Mode (Do Not Disturb)</Text>
                  <Text style={styles.settingSub}>Pause all push alerts temporarily</Text>
                </View>
                <Switch
                  value={settings.doNotDisturb}
                  onValueChange={(val) => updateSetting('doNotDisturb', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.violet }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                style={styles.permCheckBtn}
                onPress={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    Alert.alert('Permission Active', 'Device notifications are enabled for LifeTrack Pro.');
                  }
                }}
                activeOpacity={0.8}
              >
                <ShieldCheck size={16} color={COLORS.mint} />
                <Text style={styles.permCheckText}>System Permission Status: Active</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSettingsModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneText}>Save & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitleGroup: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 28,
    color: COLORS.navy,
  },
  headerSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: COLORS.t3,
    marginTop: 1,
  },
  unreadBadgePill: {
    backgroundColor: COLORS.violet,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsBtnActive: {
    backgroundColor: COLORS.violetSoft,
    borderColor: COLORS.violetSoft,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  filterChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: COLORS.t2,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  filterCountBadge: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: COLORS.t2,
  },
  filterCountTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  feedWrapper: {
    gap: 18,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.violet,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.violetSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentCol: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: COLORS.t1,
    flex: 1,
  },
  cardTitleUnread: {
    fontFamily: 'DMSans-Bold',
    color: COLORS.t1,
  },
  cardTime: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: COLORS.t3,
    marginLeft: 6,
  },
  cardBody: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: COLORS.t2,
    lineHeight: 17,
  },
  actionRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.violetSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  actionPillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: COLORS.violet,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.violetSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: COLORS.navy,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: COLORS.t2,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  clearHistoryText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: COLORS.coral,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.violetSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: COLORS.navy,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: COLORS.t1,
  },
  settingSub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: COLORS.t2,
    marginTop: 2,
  },
  permCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.mintSoft,
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  permCheckText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: COLORS.mint,
  },
  modalDoneBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalDoneText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
