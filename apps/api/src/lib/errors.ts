import type { ApiError, ErrorCode } from '@gwmt/contracts';
import type { OpenAPIHonoOptions } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppEnv } from './context.js';
import { monitoring } from './monitoring.js';

const ERROR_TABLE: Record<ErrorCode, [ContentfulStatusCode, string]> = {
  BAD_REQUEST: [400, 'Неверный формат запроса'],
  ACCESS_TOKEN_MISSING: [401, 'Нужно войти в систему'],
  ACCESS_TOKEN_EXPIRED: [401, 'Сессия истекла'],
  ACCESS_TOKEN_INVALID: [401, 'Нужно войти заново'],
  INVALID_CREDENTIALS: [401, 'Неверный email или пароль'],
  REFRESH_MISSING: [401, 'Нужно войти в систему'],
  REFRESH_INVALID: [401, 'Нужно войти заново'],
  REFRESH_EXPIRED: [401, 'Сессия истекла, войдите заново'],
  REFRESH_REUSED: [
    401,
    'Сессия завершена из соображений безопасности, войдите заново',
  ],
  FORBIDDEN_ORIGIN: [403, 'Запрос с чужого сайта отклонён'],
  SALT_INVALID: [
    403,
    'Не удалось проверить запрос. Обновите страницу и проверьте время на устройстве',
  ],
  ROLE_FORBIDDEN: [403, 'Вашей роли не хватает прав на это действие'],
  STATUS_MOVE_FORBIDDEN: [403, 'Нельзя перевести задачу в этот статус'],
  TASK_TAKE_LOCKED: [403, 'Администратор запретил брать эту задачу в работу'],
  BOARD_NOT_FOUND: [404, 'Доска не найдена'],
  TASK_NOT_FOUND: [404, 'Задача не найдена'],
  SPRINT_NOT_FOUND: [404, 'Спринт не найден'],
  USER_NOT_FOUND: [404, 'Пользователь не найден'],
  EMAIL_TAKEN: [409, 'Этот email уже зарегистрирован'],
  BOARD_KEY_TAKEN: [409, 'Такой ключ уже есть'],
  ALREADY_MEMBER: [409, 'Этот человек уже на доске'],
  TASK_LINK_EXISTS: [409, 'Эти задачи уже связаны'],
  TASK_NOT_PAUSABLE: [
    409,
    'Поставить на паузу можно только задачу в работе, на ревью или в тесте',
  ],
  TASK_NOT_LOCKABLE: [
    409,
    'Запретить брать в работу можно только задачу в статусе «К работе»',
  ],
  VALIDATION_ERROR: [422, 'Проверьте заполнение полей'],
  WRONG_PASSWORD: [422, 'Неверный пароль'],
  CANNOT_REMOVE_SELF: [422, 'Нельзя убрать себя с доски'],
  CANNOT_CHANGE_OWN_ROLE: [422, 'Нельзя поменять свою роль'],
  NOT_BOARD_MEMBER: [422, 'Этот человек не состоит в доске'],
  ASSIGNEE_IS_GUEST: [422, 'Гостя нельзя назначить на задачу'],
  TASK_LINK_SELF: [422, 'Нельзя связать задачу с самой собой'],
  TOO_MANY_ATTEMPTS: [429, 'Слишком много попыток входа, попробуйте позже'],
  INTERNAL_ERROR: [500, 'Что-то пошло не так, попробуйте ещё раз'],
};

export const errorMessage = (code: ErrorCode) => ERROR_TABLE[code][1];

interface AppErrorOptions {
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}

export class AppError extends Error {
  readonly status: ContentfulStatusCode;

  constructor(
    readonly code: ErrorCode,
    readonly options: AppErrorOptions = {},
  ) {
    const [status, message] = ERROR_TABLE[code];
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

function errorBody(
  c: Context<AppEnv>,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiError {
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
      requestId: c.get('requestId'),
    },
  };
}

export const validationHook: NonNullable<
  OpenAPIHonoOptions<AppEnv>['defaultHook']
> = (result) => {
  if (result.success) return;
  if (result.target === 'param') throw new AppError('BAD_REQUEST');

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field !== undefined) fields[String(field)] ??= issue.message;
  }
  throw new AppError('VALIDATION_ERROR', { fields });
};

export async function handleError(err: Error, c: Context<AppEnv>) {
  if (err instanceof AppError) {
    for (const [name, value] of Object.entries(err.options.headers ?? {})) {
      c.header(name, value);
    }
    if (err.status < 500) {
      return c.json(
        errorBody(c, err.code, err.message, err.options.fields),
        err.status,
      );
    }
  }

  // Битый JSON: валидатор Hono бросает HTTPException(400).
  if (err instanceof HTTPException && err.status === 400) {
    return c.json(errorBody(c, 'BAD_REQUEST', ERROR_TABLE.BAD_REQUEST[1]), 400);
  }

  // DrizzleQueryError кладёт параметры запроса (хэши токенов, email) в message и stack,
  // поэтому логируем его cause, где остаётся только ошибка Postgres.
  const safe = err.cause instanceof Error ? err.cause : err;
  // Per-event context avoids leaking one concurrent request's identity into another.
  monitoring.captureException(safe, {
    tags: { source: 'api' },
    user: c.get('userId') ? { id: c.get('userId') } : {},
    contexts: {
      http: { method: c.req.method, route: c.req.routePath },
      correlation: { requestId: c.get('requestId') },
    },
  });
  // Serverless runtimes may freeze the process as soon as the response is returned.
  await monitoring.flush();
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      name: safe.name,
      message: safe.message,
      stack: safe.stack,
    }),
  );
  return c.json(
    errorBody(c, 'INTERNAL_ERROR', ERROR_TABLE.INTERNAL_ERROR[1]),
    500,
  );
}

export function handleNotFound(c: Context<AppEnv>) {
  return c.json(errorBody(c, 'BAD_REQUEST', 'Такого адреса нет'), 404);
}
