import { useNotificationStore } from '../lib/store/notification.store';

describe('Notification Store - Permanent Dismissal & Unread Dot', () => {
  beforeEach(() => {
    useNotificationStore.getState().resetDefaults();
  });

  test('deleting a notification adds it to dismissedNotificationIds and prevents recreation in refreshDailyNudges', () => {
    const store = useNotificationStore.getState();

    // Trigger daily nudges
    store.refreshDailyNudges();

    let state = useNotificationStore.getState();
    expect(state.notifications.length).toBeGreaterThan(0);

    const firstNotif = state.notifications[0];
    const firstId = firstNotif.id;

    // Delete the notification
    store.deleteNotification(firstId);

    state = useNotificationStore.getState();
    expect(state.notifications.some((n) => n.id === firstId)).toBe(false);
    expect(state.dismissedNotificationIds).toContain(firstId);

    // Call refreshDailyNudges again
    store.refreshDailyNudges();

    state = useNotificationStore.getState();
    // The deleted notification should NOT be resurrected
    expect(state.notifications.some((n) => n.id === firstId)).toBe(false);
  });

  test('clearing all notifications clears unread count and marks them dismissed', () => {
    const store = useNotificationStore.getState();
    store.refreshDailyNudges();

    let state = useNotificationStore.getState();
    expect(state.notifications.length).toBeGreaterThan(0);

    store.clearAll();

    state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(0);
    expect(state.notifications.filter((n) => !n.isRead).length).toBe(0);
    expect(state.lastClearedAt).not.toBeNull();

    // Calling refreshDailyNudges right after clearAll should not resurrect cleared daily nudges
    store.refreshDailyNudges();

    state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(0);
  });

  test('addNotification rejects re-adding dismissed notification IDs', () => {
    const store = useNotificationStore.getState();

    store.addNotification({
      id: 'test_notif_custom',
      type: 'brief',
      title: 'Custom Alert',
      body: 'Testing',
      targetScreen: '/',
    });

    let state = useNotificationStore.getState();
    expect(state.notifications.some((n) => n.id === 'test_notif_custom')).toBe(true);

    // Delete it
    store.deleteNotification('test_notif_custom');

    state = useNotificationStore.getState();
    expect(state.notifications.some((n) => n.id === 'test_notif_custom')).toBe(false);
    expect(state.dismissedNotificationIds).toContain('test_notif_custom');

    // Attempt to re-add the same dismissed ID
    store.addNotification({
      id: 'test_notif_custom',
      type: 'brief',
      title: 'Custom Alert',
      body: 'Testing again',
      targetScreen: '/',
    });

    state = useNotificationStore.getState();
    expect(state.notifications.some((n) => n.id === 'test_notif_custom')).toBe(false);
  });
});
