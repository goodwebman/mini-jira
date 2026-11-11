import { taskCardSchema } from '@gwmt/contracts';
import { apiClient } from '@/shared/api';

/** PUT `/tasks/{key}/take-lock`. */
export async function setTaskTakeLock(key: string) {
  return apiClient.put<unknown>(`/tasks/${encodeURIComponent(key)}/take-lock`).then(taskCardSchema.parse);
}

/** DELETE `/tasks/{key}/take-lock`. */
export async function clearTaskTakeLock(key: string) {
  return apiClient.delete<unknown>(`/tasks/${encodeURIComponent(key)}/take-lock`).then(taskCardSchema.parse);
}

/** POST `/tasks/{key}/pause`. */
export async function pauseTask(key: string) {
  return apiClient.post<unknown>(`/tasks/${encodeURIComponent(key)}/pause`).then(taskCardSchema.parse);
}

/** POST `/tasks/{key}/resume`. */
export async function resumeTask(key: string) {
  return apiClient.post<unknown>(`/tasks/${encodeURIComponent(key)}/resume`).then(taskCardSchema.parse);
}
