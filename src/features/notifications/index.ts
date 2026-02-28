export {
  requestNotificationPermission,
  getExpoPushToken,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  getBadgeCount,
  setBadgeCount,
  dismissAllNotifications,
} from './notificationService';

export { useNotificationListeners } from './useNotifications';
export { useNotificationObserver } from './useNotificationObserver';

export type {
  LocalNotificationInput,
  ScheduledNotificationInfo,
} from './types';
