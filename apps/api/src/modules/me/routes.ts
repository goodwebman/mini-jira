import {
  changePasswordBodySchema,
  meSchema,
  myTaskStatsSchema,
  myTasksQuerySchema,
  myTasksResponseSchema,
  navSummaryQuerySchema,
  navSummarySchema,
  updateMeBodySchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import {
  ACCESS_ERRORS,
  bearerAuth,
  createRouter,
  errors,
  jsonBody,
  jsonResponse,
} from '../../lib/router.js';
import { listMyTasks } from '../tasks/service.js';
import * as service from './service.js';
import { getNavSummary, getTaskStats } from './summary.js';

const tags = [TAG.me];

export function meRoutes(deps: AppDeps) {
  const router = createRouter();

  router.openapi(
    createRoute({
      method: 'get',
      path: '/me',
      operationId: 'getMe',
      tags,
      summary: 'Текущий пользователь',
      security: bearerAuth,
      responses: {
        200: jsonResponse(meSchema, 'Профиль'),
        ...errors({ 401: ACCESS_ERRORS }),
      },
    }),
    async (c) => c.json(await service.getMe(deps, c.get('userId')), 200),
  );

  router.openapi(
    createRoute({
      method: 'patch',
      path: '/me',
      operationId: 'updateMe',
      tags,
      summary: 'Изменить профиль',
      security: bearerAuth,
      request: { body: jsonBody(updateMeBodySchema) },
      responses: {
        200: jsonResponse(meSchema, 'Обновлённый профиль'),
        ...errors({
          400: ['BAD_REQUEST'],
          401: ACCESS_ERRORS,
          409: ['EMAIL_TAKEN'],
          422: ['VALIDATION_ERROR'],
        }),
      },
    }),
    async (c) => c.json(await service.updateMe(deps, c.get('userId'), c.req.valid('json')), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/me/password',
      operationId: 'changePassword',
      tags,
      summary: 'Сменить пароль',
      description:
        'Отзывает все сессии, кроме текущей. Неверный текущий пароль это 422, а не 401: перехватчик токенов не должен срабатывать.',
      security: bearerAuth,
      request: { body: jsonBody(changePasswordBodySchema) },
      responses: {
        204: { description: 'Пароль изменён' },
        ...errors({
          400: ['BAD_REQUEST'],
          401: ACCESS_ERRORS,
          422: ['VALIDATION_ERROR', 'WRONG_PASSWORD'],
        }),
      },
    }),
    async (c) => {
      await service.changePassword(
        deps,
        c.get('userId'),
        c.get('sessionId'),
        c.req.valid('json'),
      );
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/me/nav-summary',
      operationId: 'getNavSummary',
      tags,
      summary: 'Данные боковых плиток',
      description:
        'Всё для бокового меню одним запросом. Без досок `board` и `kpi` равны `null`. Запускает ленивую смену спринта.',
      security: bearerAuth,
      request: { query: navSummaryQuerySchema },
      responses: {
        200: jsonResponse(navSummarySchema, 'Сводка'),
        ...errors({ 401: ACCESS_ERRORS, 404: ['BOARD_NOT_FOUND'], 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(await getNavSummary(deps, c.get('userId'), c.req.valid('query').boardId), 200),
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/me/task-stats',
      operationId: 'getMyTaskStats',
      tags,
      summary: 'Статистика задач для профиля',
      description: 'Учитываются только задачи с досок, где пользователь участник.',
      security: bearerAuth,
      responses: {
        200: jsonResponse(myTaskStatsSchema, 'Статистика'),
        ...errors({ 401: ACCESS_ERRORS }),
      },
    }),
    async (c) => c.json(await getTaskStats(deps, c.get('userId')), 200),
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/me/tasks',
      operationId: 'listMyTasks',
      tags,
      summary: 'Мои задачи',
      description:
        'Задачи, где пользователь занимает любую роль, только с досок, где он участник. ' +
        'Сортировка: `work`, `review`, `test`, `todo`, `done`, затем ключ доски, затем номер как число. ' +
        '`total` учитывает фильтры, `summary` нет.',
      security: bearerAuth,
      request: { query: myTasksQuerySchema },
      responses: {
        200: jsonResponse(myTasksResponseSchema, 'Страница задач'),
        ...errors({ 401: ACCESS_ERRORS, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) => c.json(await listMyTasks(deps, c.get('userId'), c.req.valid('query')), 200),
  );

  return router;
}
