import { type ErrorCode, apiErrorSchema } from '@gwmt/contracts';

import { HttpError } from './client';

const FALLBACK_MESSAGE = 'Что-то пошло не так, попробуйте ещё раз';

export interface ApiErrorInfo {
  /** HTTP-статус; `null`, если ответа от сервера не было. */
  readonly status: number | null;
  /** Машинный код из тела ответа; `null`, если тело не в формате API. */
  readonly code: ErrorCode | null;
  /** Готовый текст для тоста. */
  readonly message: string;
  /** Тексты ошибок под полями формы (обычно на 422). */
  readonly fields: Readonly<Record<string, string>>;
  readonly requestId: string | null;
}

/**
 * Достаёт из любой ошибки запроса то, что можно показать пользователю.
 * Сообщение берётся из `{ error: { message } }` бэкенда, иначе подставляется запасной текст.
 */
export function readApiError(error: unknown): ApiErrorInfo {
  if (error instanceof HttpError) {
    const parsed = apiErrorSchema.safeParse(error.body);
    if (parsed.success) {
      const { code, message, fields, requestId } = parsed.data.error;
      return {
        status: error.status,
        code,
        message,
        fields: fields ?? {},
        requestId,
      };
    }
    return info(error.status, FALLBACK_MESSAGE);
  }
  // AuthError живёт в entities/auth, shared его импортировать не может. Его тексты на русском
  // и без секретов, а сетевые сбои авторизованного транспорта приходят как AuthError('network').
  if (error instanceof Error && error.name === 'AuthError')
    return info(null, error.message);
  return info(null, FALLBACK_MESSAGE);
}

function info(status: number | null, message: string): ApiErrorInfo {
  return { status, code: null, message, fields: {}, requestId: null };
}
