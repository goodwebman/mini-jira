import { apiClient } from '@/shared/api';

export const markNotificationRead = (id: string) =>
  apiClient.put<void>(`/notifications/${encodeURIComponent(id)}/read`);
export const markAllNotificationsRead = () =>
  apiClient.put<void>('/notifications/read');
export const deleteNotification = (id: string) =>
  apiClient.delete<void>(`/notifications/${encodeURIComponent(id)}`);
