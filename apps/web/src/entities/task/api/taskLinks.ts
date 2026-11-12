import { createLinkBodySchema, taskLinkItemSchema } from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { CreateLinkBody } from '../model';

/** POST `/tasks/{key}/links`. Обратная связь создаётся сервером. */
export async function createTaskLink(key: string, body: CreateLinkBody) {
  return apiClient
    .post<unknown>(
      `/tasks/${encodeURIComponent(key)}/links`,
      createLinkBodySchema.parse(body),
    )
    .then(taskLinkItemSchema.parse);
}

/** DELETE `/tasks/{key}/links/{targetKey}` — удаляет обе стороны связи. */
export async function deleteTaskLink(
  key: string,
  targetKey: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/tasks/${encodeURIComponent(key)}/links/${encodeURIComponent(targetKey)}`,
  );
}
