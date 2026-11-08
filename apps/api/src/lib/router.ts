import { apiErrorSchema, type ErrorCode } from '@gwmt/contracts';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { z } from 'zod';
import type { AppEnv } from './context.js';
import { errorMessage, validationHook } from './errors.js';

export const createRouter = () => new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

export const bearerAuth = [{ bearerAuth: [] }];
export const refreshCookie = [{ refreshCookie: [] }];
export const noAuth: Record<string, string[]>[] = [];

/** `required` обязателен: без него запрос без JSON прошёл бы мимо валидатора с пустым телом. */
export const jsonBody = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { 'application/json': { schema } },
});

export const jsonResponse = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});

export const setsRefreshCookie = {
  'Set-Cookie': {
    description: 'gwmt_refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth',
    schema: { type: 'string' as const },
  },
};

const errorResponse = (codes: readonly ErrorCode[]) =>
  jsonResponse(
    apiErrorSchema,
    codes.map((code) => `- \`${code}\`: ${errorMessage(code)}`).join('\n'),
  );

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

/** Ответы с ошибками ручки: каждому статусу перечисляются его коды контракта. */
export function errors<const T extends Partial<Record<ErrorStatus, readonly ErrorCode[]>>>(map: T) {
  const entries = Object.entries(map).map(([status, codes]) => [
    status,
    errorResponse(codes as readonly ErrorCode[]),
  ]);
  return Object.fromEntries(entries) as { [K in keyof T]: ReturnType<typeof errorResponse> };
}

export const ACCESS_ERRORS = [
  'ACCESS_TOKEN_MISSING',
  'ACCESS_TOKEN_EXPIRED',
  'ACCESS_TOKEN_INVALID',
] as const;

export const boardErrors = {
  400: ['BAD_REQUEST'],
  401: ACCESS_ERRORS,
  404: ['BOARD_NOT_FOUND'],
} as const;

export const taskErrors = {
  400: ['BAD_REQUEST'],
  401: ACCESS_ERRORS,
  404: ['TASK_NOT_FOUND'],
} as const;
