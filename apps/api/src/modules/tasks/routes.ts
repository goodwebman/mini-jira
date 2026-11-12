import {
  boardIdParamSchema,
  boardTasksResponseSchema,
  can,
  createCommentBodySchema,
  createLinkBodySchema,
  createStatusError,
  createTaskBodySchema,
  taskCardSchema,
  taskCommentSchema,
  taskDetailSchema,
  taskKeyParamSchema,
  taskLinkItemSchema,
  taskLinkParamSchema,
  taskSearchQuerySchema,
  taskSearchResponseSchema,
  taskStatusSchema,
  updateTaskBodySchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import { createMiddleware } from 'hono/factory';

import { TAG } from '../../lib/api-docs.js';
import type { AppDeps, AppEnv } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { peekJsonObject } from '../../lib/request.js';
import {
  ACCESS_ERRORS,
  bearerAuth,
  boardErrors,
  createRouter,
  errors,
  jsonBody,
  jsonResponse,
  taskErrors,
} from '../../lib/router.js';
import {
  requireAction,
  requireBoardMember,
  requireTaskAccess,
} from '../boards/access.js';
import * as service from './service.js';

const tags = [TAG.tasks];
const linkTags = [TAG.links];

const requireCreateStatus = createMiddleware<AppEnv>(async (c, next) => {
  const status = taskStatusSchema.safeParse((await peekJsonObject(c))?.status);
  if (status.success) {
    const error = createStatusError(c.get('boardRole'), status.data);
    if (error) throw new AppError(error);
  }
  return next();
});

const requireEditableFields = createMiddleware<AppEnv>(async (c, next) => {
  const role = c.get('boardRole');
  if (role === 'guest') throw new AppError('ROLE_FORBIDDEN');
  if (!can(role, 'task.edit')) {
    const body = await peekJsonObject(c);
    if (body && Object.keys(body).some((field) => field !== 'status')) {
      throw new AppError('ROLE_FORBIDDEN');
    }
  }
  return next();
});

export function tasksRoutes(deps: AppDeps) {
  const router = createRouter();
  const boardMember = requireBoardMember(deps);
  const taskAccess = requireTaskAccess(deps);
  const card = jsonResponse(taskCardSchema, 'Карточка задачи');
  const actionErrors = { ...taskErrors, 403: ['ROLE_FORBIDDEN'] } as const;

  router.openapi(
    createRoute({
      method: 'get',
      path: '/boards/{boardId}/tasks',
      operationId: 'listBoardTasks',
      tags,
      summary: 'Задачи активного спринта',
      description:
        'Весь активный спринт одним списком, фильтров на сервере нет: поиск, приоритет и фильтр по людям работают на клиенте. Порядок: `createdAt` по возрастанию, затем номер.',
      security: bearerAuth,
      middleware: [boardMember],
      request: { params: boardIdParamSchema },
      responses: {
        200: jsonResponse(boardTasksResponseSchema, 'Спринт и задачи'),
        ...errors(boardErrors),
      },
    }),
    async (c) =>
      c.json(await service.listBoardTasks(deps, c.get('boardId')), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/boards/{boardId}/tasks',
      operationId: 'createTask',
      tags,
      summary: 'Создать задачу',
      description:
        'Задача попадает в активный спринт. Рабочий создаёт только в `todo`, администратор в любом статусе. Человек с задачи должен быть участником доски и не гостем.',
      security: bearerAuth,
      middleware: [
        boardMember,
        requireAction('task.create'),
        requireCreateStatus,
      ],
      request: {
        params: boardIdParamSchema,
        body: jsonBody(createTaskBodySchema),
      },
      responses: {
        201: jsonResponse(taskCardSchema, 'Задача создана'),
        ...errors({
          ...boardErrors,
          403: ['ROLE_FORBIDDEN', 'STATUS_MOVE_FORBIDDEN'],
          422: ['VALIDATION_ERROR', 'NOT_BOARD_MEMBER', 'ASSIGNEE_IS_GUEST'],
        }),
      },
    }),
    async (c) =>
      c.json(
        await service.createTask(
          deps,
          c.get('boardId'),
          c.get('userId'),
          c.req.valid('json'),
        ),
        201,
      ),
  );

  // Регистрируется раньше /tasks/{key}, иначе «search» разбирался бы как ключ задачи.
  router.openapi(
    createRoute({
      method: 'get',
      path: '/tasks/search',
      operationId: 'searchTasks',
      tags: linkTags,
      summary: 'Поиск задач для связывания',
      description:
        'Только задачи с досок, где у пользователя роль `admin` или `worker`. Сортировка по `updated_at`, новые сверху.',
      security: bearerAuth,
      request: { query: taskSearchQuerySchema },
      responses: {
        200: jsonResponse(taskSearchResponseSchema, 'Найденные задачи'),
        ...errors({ 401: ACCESS_ERRORS, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(
        await service.searchTasks(deps, c.get('userId'), c.req.valid('query')),
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/tasks/{key}',
      operationId: 'getTask',
      tags,
      summary: 'Деталь задачи',
      security: bearerAuth,
      middleware: [taskAccess],
      request: { params: taskKeyParamSchema },
      responses: {
        200: jsonResponse(taskDetailSchema, 'Задача'),
        ...errors(taskErrors),
      },
    }),
    async (c) =>
      c.json(
        await service.getTaskDetail(
          deps,
          c.get('task'),
          c.get('userId'),
          c.get('boardRole'),
        ),
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'patch',
      path: '/tasks/{key}',
      operationId: 'updateTask',
      tags,
      summary: 'Изменить задачу или её статус',
      description:
        'Рабочий может прислать только `status`, иначе весь запрос отклоняется. Смена статуса сбрасывает паузу. Тот же статус ничего не меняет. ' +
        'Нынешнего человека можно оставить в роли, даже если его убрали с доски или понизили до гостя.',
      security: bearerAuth,
      middleware: [taskAccess, requireEditableFields],
      request: {
        params: taskKeyParamSchema,
        body: jsonBody(updateTaskBodySchema),
      },
      responses: {
        200: card,
        ...errors({
          ...taskErrors,
          403: ['ROLE_FORBIDDEN', 'STATUS_MOVE_FORBIDDEN', 'TASK_TAKE_LOCKED'],
          422: ['VALIDATION_ERROR', 'NOT_BOARD_MEMBER', 'ASSIGNEE_IS_GUEST'],
        }),
      },
    }),
    async (c) =>
      c.json(
        await service.updateTask(
          deps,
          c.get('task'),
          { id: c.get('userId'), role: c.get('boardRole') },
          c.req.valid('json'),
        ),
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'put',
      path: '/tasks/{key}/take-lock',
      operationId: 'setTaskTakeLock',
      tags,
      summary: 'Запретить брать в работу',
      description:
        'Только `admin` и только в `todo`. Рабочий не сможет вывести задачу из `todo`. Повторная установка возвращает 200 без изменений. При переносе в следующий спринт запрет сохраняется.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.lock')],
      request: { params: taskKeyParamSchema },
      responses: {
        200: card,
        ...errors({ ...actionErrors, 409: ['TASK_NOT_LOCKABLE'] }),
      },
    }),
    async (c) => c.json(await service.setTakeLock(deps, c.get('task').id), 200),
  );

  router.openapi(
    createRoute({
      method: 'delete',
      path: '/tasks/{key}/take-lock',
      operationId: 'clearTaskTakeLock',
      tags,
      summary: 'Снять запрет брать в работу',
      description:
        'Только `admin`. Повторное снятие возвращает 200 без изменений.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.lock')],
      request: { params: taskKeyParamSchema },
      responses: { 200: card, ...errors(actionErrors) },
    }),
    async (c) =>
      c.json(await service.clearTakeLock(deps, c.get('task').id), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/tasks/{key}/pause',
      operationId: 'pauseTask',
      tags,
      summary: 'Поставить на паузу',
      description:
        'Только в `work`, `review`, `test`. Повторная пауза возвращает 200 без изменений.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.pause')],
      request: { params: taskKeyParamSchema },
      responses: {
        200: card,
        ...errors({ ...actionErrors, 409: ['TASK_NOT_PAUSABLE'] }),
      },
    }),
    async (c) => c.json(await service.pauseTask(deps, c.get('task').id), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/tasks/{key}/resume',
      operationId: 'resumeTask',
      tags,
      summary: 'Снять с паузы',
      description: 'Без паузы возвращает 200 без изменений.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.pause')],
      request: { params: taskKeyParamSchema },
      responses: { 200: card, ...errors(actionErrors) },
    }),
    async (c) => c.json(await service.resumeTask(deps, c.get('task').id), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/tasks/{key}/links',
      operationId: 'createTaskLink',
      tags: linkTags,
      summary: 'Связать задачи',
      description:
        'Обратная сторона создаётся сама. На пару задач только одна связь любого типа. Можно связывать задачи разных досок, нужна роль `admin` или `worker` на обеих.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.link')],
      request: {
        params: taskKeyParamSchema,
        body: jsonBody(createLinkBodySchema),
      },
      responses: {
        201: jsonResponse(taskLinkItemSchema, 'Связь создана'),
        ...errors({
          ...actionErrors,
          409: ['TASK_LINK_EXISTS'],
          422: ['VALIDATION_ERROR', 'TASK_LINK_SELF'],
        }),
      },
    }),
    async (c) =>
      c.json(
        await service.createLink(
          deps,
          c.get('task'),
          c.get('userId'),
          c.req.valid('json'),
        ),
        201,
      ),
  );

  router.openapi(
    createRoute({
      method: 'delete',
      path: '/tasks/{key}/links/{targetKey}',
      operationId: 'deleteTaskLink',
      tags: linkTags,
      summary: 'Удалить связь',
      description:
        'Удаляет обе стороны. Нужна роль `admin` или `worker` на обеих досках.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.link')],
      request: { params: taskLinkParamSchema },
      responses: {
        204: { description: 'Связь удалена с обеих сторон' },
        ...errors(actionErrors),
      },
    }),
    async (c) => {
      await service.deleteLink(
        deps,
        c.get('task'),
        c.get('userId'),
        c.req.valid('param').targetKey,
      );
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/tasks/{key}/comments',
      operationId: 'createTaskComment',
      tags: linkTags,
      summary: 'Добавить комментарий',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.comment')],
      request: {
        params: taskKeyParamSchema,
        body: jsonBody(createCommentBodySchema),
      },
      responses: {
        201: jsonResponse(taskCommentSchema, 'Комментарий добавлен'),
        ...errors({ ...actionErrors, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(
        await service.createComment(
          deps,
          c.get('task').id,
          c.get('userId'),
          c.req.valid('json'),
        ),
        201,
      ),
  );

  return router;
}
