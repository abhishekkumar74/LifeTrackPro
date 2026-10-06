import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Bell, Flame, Brain, Trophy, CheckCheck, X, ChevronRight, Settings, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';

interface AppNotification {
  id: string;
  type: 'brief' | 'streak' | 'revision' | 'milestone';
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  targetScreen: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'brief',
    title: 'Daily Morning Brief ☀️',
    body: "Today's focus: Complete your planned focus blocks and keep momentum!",
    time: '8:00 AM',
    isRead: false,
    targetScreen: '/',
  },
  {
    id: '2',
    type: 'streak',
    title: "Don't break your streak! 🔥",
    body: 'You are on a streak! Complete 1 habit today to keep your fire alive.',
    time: '2h ago',
    isRead: false,
    targetScreen: '/habits',
  },
  {
    id: '3',
    type: 'revision',
    title: 'Spaced Repetition Nudge 🧠',
    body: 'Time to revise key syllabus topics to lock knowledge into long-term memory.',
    time: 'Yesterday',
    isRead: true,
    targetScreen: '/(tabs)/learn',
  },
  {
    id: '4',
    type: 'milestone',
    title: 'Focus Goal Achieved! 🏆',
    body: 'Congratulations! You reached over 10 hours of total deep focus time.',
    time: '2 days ago',
    isRead: true,
    targetScreen: '/(tabs)/stats',
  },
];

interface NotificationSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const NotificationSheet: React.FC<NotificationSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const handleItemPress = async (item: AppNotification) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    onClose();
    setTimeout(() => {
      router.push(item.targetScreen as Href);
    }, 150);
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'brief':
        return <Sparkles size={18} color="#5B4FE8" />;
      case 'streak':
        return <Flame size={18} color="#E8A020" fill="#E8A020" />;
      case 'revision':
        return <Brain size={18} color="#00B894" />;
      case 'milestone':
        return <Trophy size={18} color="#E85858" />;
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.bellIconBadge}>
                <Bell size={18} color="#5B4FE8" />
              </View>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                  <CheckCheck size={18} color="#5B4FE8" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#9B9BAF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Settings Toggle Row */}
          <View style={styles.settingsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Settings size={15} color="#9B9BAF" />
              <Text style={styles.settingsText}>Daily Reminders Active</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E8E7E3', true: '#5B4FE8' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Notifications List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notificationItem,
                  !item.isRead && styles.notificationItemUnread,
                ]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.75}
              >
                <View style={styles.itemIconCol}>{getIcon(item.type)}</View>

                <View style={styles.itemTextCol}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        !item.isRead && styles.itemTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.itemTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.itemBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>

                <ChevronRight size={16} color="#9B9BAF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bellIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAE8FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: '#17172A',
  },
  unreadBadge: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  settingsText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#17172A',
  },
  listContent: {
    gap: 10,
    paddingBottom: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notificationItemUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE8FD',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  itemIconCol: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0EFFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '500',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#17172A',
  },
  itemTime: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF',
    marginLeft: 6,
  },
  itemBody: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#9B9BAF',
    lineHeight: 16,
  },
});
