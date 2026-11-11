import { changePasswordBodySchema, meSchema, updateMeBodySchema } from '@gwmt/contracts';
import type { ChangePasswordBody, UpdateMeBody } from '../model';
import { apiClient } from '@/shared/api';

/** PATCH `/me`. */
export async function updateProfile(body: UpdateMeBody) {
  return apiClient.patch<unknown>('/me', updateMeBodySchema.parse(body)).then(meSchema.parse);
}

/** POST `/me/password`. Сервер сохраняет текущую сессию и отзывает остальные. */
export async function changePassword(body: ChangePasswordBody): Promise<void> {
  return apiClient.post<void>('/me/password', changePasswordBodySchema.parse(body));
}
