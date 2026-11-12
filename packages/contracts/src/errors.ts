import { z } from 'zod';

export const ERROR_CODES = [
  'BAD_REQUEST',
  'ACCESS_TOKEN_MISSING',
  'ACCESS_TOKEN_EXPIRED',
  'ACCESS_TOKEN_INVALID',
  'INVALID_CREDENTIALS',
  'REFRESH_MISSING',
  'REFRESH_INVALID',
  'REFRESH_EXPIRED',
  'REFRESH_REUSED',
  'FORBIDDEN_ORIGIN',
  'SALT_INVALID',
  'ROLE_FORBIDDEN',
  'STATUS_MOVE_FORBIDDEN',
  'TASK_TAKE_LOCKED',
  'BOARD_NOT_FOUND',
  'TASK_NOT_FOUND',
  'SPRINT_NOT_FOUND',
  'USER_NOT_FOUND',
  'EMAIL_TAKEN',
  'BOARD_KEY_TAKEN',
  'ALREADY_MEMBER',
  'TASK_LINK_EXISTS',
  'TASK_NOT_PAUSABLE',
  'TASK_NOT_LOCKABLE',
  'VALIDATION_ERROR',
  'WRONG_PASSWORD',
  'CANNOT_REMOVE_SELF',
  'CANNOT_CHANGE_OWN_ROLE',
  'NOT_BOARD_MEMBER',
  'ASSIGNEE_IS_GUEST',
  'TASK_LINK_SELF',
  'TOO_MANY_ATTEMPTS',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES).meta({
  id: 'ErrorCode',
  description:
    'Машинный код ошибки. Какие коды возможны на ручке, указано в её ответах.',
});
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string().describe('Готовый русский текст для тоста'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Ключ это имя поля запроса, значение это текст под полем'),
      requestId: z.string().describe('Совпадает с заголовком X-Request-Id'),
    }),
  })
  .meta({ id: 'ApiError', description: 'Формат любой ошибки API' });
export type ApiError = z.infer<typeof apiErrorSchema>;
