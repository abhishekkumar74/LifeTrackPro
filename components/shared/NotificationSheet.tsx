import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import {
  Bell,
  Flame,
  Brain,
  Trophy,
  CheckCheck,
  X,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  BellOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, Href } from 'expo-router';
import {
  useNotificationStore,
  AppNotification,
  NotificationType,
} from '@/lib/store/notification.store';

interface NotificationSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const NotificationSheet: React.FC<NotificationSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { notifications, settings, markAsRead, markAllAsRead, updateSetting } =
    useNotificationStore();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemPress = async (item: AppNotification) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    markAsRead(item.id);
    onClose();
    setTimeout(() => {
      if (item.targetScreen) {
        router.push(item.targetScreen as Href);
      }
    }, 150);
  };

  const handleOpenFullPage = () => {
    onClose();
    setTimeout(() => {
      router.push('/notifications' as Href);
    }, 150);
  };

  const getItemStyles = (type: NotificationType) => {
    switch (type) {
      case 'brief':
        return {
          bg: '#EAE7FF',
          color: '#5B4FE8',
          icon: <Sparkles size={18} color="#5B4FE8" />,
        };
      case 'streak':
        return {
          bg: '#FEF3C7',
          color: '#D97706',
          icon: <Flame size={18} color="#D97706" fill="#D97706" />,
        };
      case 'revision':
        return {
          bg: '#D1FAE5',
          color: '#059669',
          icon: <Brain size={18} color="#059669" />,
        };
      case 'milestone':
        return {
          bg: '#FFE4E6',
          color: '#E11D48',
          icon: <Trophy size={18} color="#E11D48" />,
        };
      default:
        return {
          bg: '#EEF2FF',
          color: '#4F46E5',
          icon: <Bell size={18} color="#4F46E5" />,
        };
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
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Cozy Drag Handle Indicator */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellBadgeCircle}>
                <Bell size={18} color="#5B4FE8" />
              </View>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadPillText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActionGroup}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllAsRead}
                  activeOpacity={0.7}
                  style={styles.headerIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CheckCheck size={18} color="#5B4FE8" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.headerCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#78716C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cozy Quick Settings Toggle Row */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsLeft}>
              <View style={styles.slidersIconCircle}>
                <SlidersHorizontal size={14} color="#5B4FE8" />
              </View>
              <Text style={styles.settingsText}>Daily Reminders Active</Text>
            </View>
            <Switch
              value={settings.morningBriefEnabled}
              onValueChange={(val) => updateSetting('morningBriefEnabled', val)}
              trackColor={{ false: '#E7E5E4', true: '#5B4FE8' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Notifications List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <BellOff size={26} color="#A8A29E" />
                </View>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySub}>No active notifications right now.</Text>
              </View>
            ) : (
              notifications.slice(0, 5).map((item) => {
                const styleMeta = getItemStyles(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      !item.isRead && styles.cardUnread,
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.8}
                  >
                    {/* Unread Accent Pill */}
                    {!item.isRead && (
                      <View style={[styles.unreadAccentBar, { backgroundColor: styleMeta.color }]} />
                    )}

                    {/* Pastel Icon Bubble */}
                    <View style={[styles.iconBubble, { backgroundColor: styleMeta.bg }]}>
                      {styleMeta.icon}
                    </View>

                    {/* Card Content */}
                    <View style={styles.cardTextCol}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            !item.isRead && styles.cardTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.cardTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.cardBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>

                    <ChevronRight size={16} color="#A8A29E" />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer Full Center CTA */}
          <TouchableOpacity
            style={styles.fullCenterBtn}
            onPress={handleOpenFullPage}
            activeOpacity={0.85}
          >
            <Text style={styles.fullCenterBtnText}>Open Notification Center</Text>
            <ExternalLink size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderTopWidth: 1,
    borderColor: '#F3EFEA',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7E5E4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAE7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 26,
    color: '#1C1917',
  },
  unreadPill: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  unreadPillText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAE7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slidersIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EAE7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#1C1917',
  },
  listContent: {
    gap: 12,
    paddingBottom: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#1C1917',
  },
  emptySub: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#78716C',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCD6CB',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextCol: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#292524',
    flex: 1,
  },
  cardTitleUnread: {
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
  },
  cardTime: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#A8A29E',
    marginLeft: 6,
  },
  cardBody: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: '#57534E',
    lineHeight: 17,
  },
  fullCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5B4FE8',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fullCenterBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
