import { createTaskBodySchema, taskCardSchema, updateTaskBodySchema } from '@gwmt/contracts';
import type { CreateTaskBody, UpdateTaskBody } from '../model';
import { apiClient } from '@/shared/api';

/** POST `/boards/{boardId}/tasks`. */
export async function createTask(boardId: number, body: CreateTaskBody) {
  return apiClient.post<unknown>(`/boards/${boardId}/tasks`, createTaskBodySchema.parse(body)).then(taskCardSchema.parse);
}

/** PATCH `/tasks/{key}`. Для worker тело должно содержать только status. */
export async function updateTask(key: string, body: UpdateTaskBody) {
  return apiClient.patch<unknown>(`/tasks/${encodeURIComponent(key)}`, updateTaskBodySchema.parse(body)).then(taskCardSchema.parse);
}
