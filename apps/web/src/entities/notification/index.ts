export type { Notification, NotificationsResponse } from '@gwmt/contracts';
export {
  notificationQueryKeys,
  notificationsQueryOptions,
} from './api/notificationQueries';
export {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notificationActions';
