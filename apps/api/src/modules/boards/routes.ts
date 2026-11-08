import {
  addMemberBodySchema,
  boardDetailSchema,
  boardIdParamSchema,
  boardListResponseSchema,
  boardMemberParamSchema,
  boardMemberSchema,
  boardsQuerySchema,
  createBoardBodySchema,
  updateMemberBodySchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import {
  ACCESS_ERRORS,
  bearerAuth,
  boardErrors,
  createRouter,
  errors,
  jsonBody,
  jsonResponse,
} from '../../lib/router.js';
import { requireAction, requireBoardMember } from './access.js';
import * as repo from './repo.js';
import * as service from './service.js';

const boardTags = [TAG.boards];
const memberTags = [TAG.members];

const memberErrors = {
  ...boardErrors,
  403: ['ROLE_FORBIDDEN'],
  404: ['BOARD_NOT_FOUND', 'USER_NOT_FOUND'],
} as const;

export function boardsRoutes(deps: AppDeps) {
  const router = createRouter();
  const member = requireBoardMember(deps);
  const manageMembers = requireAction('members.manage');

  router.openapi(
    createRoute({
      method: 'get',
      path: '/boards',
      operationId: 'listBoards',
      tags: boardTags,
      summary: 'Доски пользователя',
      description: 'Без пагинации, по названию. Видны только доски, где пользователь участник.',
      security: bearerAuth,
      request: { query: boardsQuerySchema },
      responses: {
        200: jsonResponse(boardListResponseSchema, 'Список досок'),
        ...errors({ 401: ACCESS_ERRORS, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) => c.json(await service.listBoards(deps, c.get('userId'), c.req.valid('query')), 200),
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/boards',
      operationId: 'createBoard',
      tags: boardTags,
      summary: 'Создать доску',
      description:
        'Создатель становится `admin`, остальные из `memberIds` получают `worker`. Ключ неизменяем, часовой пояс берётся из профиля создателя. Сразу создаётся спринт 1.',
      security: bearerAuth,
      request: { body: jsonBody(createBoardBodySchema) },
      responses: {
        201: jsonResponse(boardDetailSchema, 'Доска создана'),
        ...errors({
          400: ['BAD_REQUEST'],
          401: ACCESS_ERRORS,
          404: ['USER_NOT_FOUND'],
          409: ['BOARD_KEY_TAKEN'],
          422: ['VALIDATION_ERROR'],
        }),
      },
    }),
    async (c) => c.json(await service.createBoard(deps, c.get('userId'), c.req.valid('json')), 201),
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/boards/{boardId}',
      operationId: 'getBoard',
      tags: boardTags,
      summary: 'Деталь доски',
      description: 'Источник участников для чипов, селектов и экрана участников.',
      security: bearerAuth,
      middleware: [member],
      request: { params: boardIdParamSchema },
      responses: {
        200: jsonResponse(boardDetailSchema, 'Доска'),
        ...errors(boardErrors),
      },
    }),
    async (c) => c.json(await service.getBoardDetail(deps, c.get('boardId'), c.get('userId')), 200),
  );

  router.openapi(
    createRoute({
      method: 'put',
      path: '/boards/{boardId}/favorite',
      operationId: 'addBoardToFavorites',
      tags: boardTags,
      summary: 'Добавить в избранное',
      description: 'Идемпотентно. Доступно и гостю.',
      security: bearerAuth,
      middleware: [member],
      request: { params: boardIdParamSchema },
      responses: { 204: { description: 'Готово' }, ...errors(boardErrors) },
    }),
    async (c) => {
      await repo.addFavorite(deps.db, c.get('boardId'), c.get('userId'), deps.now());
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      method: 'delete',
      path: '/boards/{boardId}/favorite',
      operationId: 'removeBoardFromFavorites',
      tags: boardTags,
      summary: 'Убрать из избранного',
      description: 'Идемпотентно. Доступно и гостю.',
      security: bearerAuth,
      middleware: [member],
      request: { params: boardIdParamSchema },
      responses: { 204: { description: 'Готово' }, ...errors(boardErrors) },
    }),
    async (c) => {
      await repo.removeFavorite(deps.db, c.get('boardId'), c.get('userId'));
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/boards/{boardId}/members',
      operationId: 'addBoardMember',
      tags: memberTags,
      summary: 'Добавить участника',
      description: 'Только `admin`.',
      security: bearerAuth,
      middleware: [member, manageMembers],
      request: { params: boardIdParamSchema, body: jsonBody(addMemberBodySchema) },
      responses: {
        201: jsonResponse(boardMemberSchema, 'Участник добавлен'),
        ...errors({ ...memberErrors, 409: ['ALREADY_MEMBER'], 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(
        await service.addMember(deps, c.get('boardId'), c.get('userId'), c.req.valid('json')),
        201,
      ),
  );

  router.openapi(
    createRoute({
      method: 'patch',
      path: '/boards/{boardId}/members/{userId}',
      operationId: 'updateBoardMember',
      tags: memberTags,
      summary: 'Поменять роль участника',
      description:
        'Только `admin`. Свою роль поменять нельзя, поэтому на доске всегда остаётся администратор. Новая роль действует сразу, в том числе для уже выданных токенов.',
      security: bearerAuth,
      middleware: [member, manageMembers],
      request: { params: boardMemberParamSchema, body: jsonBody(updateMemberBodySchema) },
      responses: {
        200: jsonResponse(boardMemberSchema, 'Роль изменена'),
        ...errors({ ...memberErrors, 422: ['VALIDATION_ERROR', 'CANNOT_CHANGE_OWN_ROLE'] }),
      },
    }),
    async (c) =>
      c.json(
        await service.updateMember(
          deps,
          c.get('boardId'),
          c.get('userId'),
          c.req.valid('param').userId,
          c.req.valid('json'),
        ),
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'delete',
      path: '/boards/{boardId}/members/{userId}',
      operationId: 'removeBoardMember',
      tags: memberTags,
      summary: 'Убрать участника',
      description:
        'Только `admin`. Себя убрать нельзя. Роли человека в задачах сохраняются, но в его «Моих задачах» и статистике задачи этой доски больше не показываются.',
      security: bearerAuth,
      middleware: [member, manageMembers],
      request: { params: boardMemberParamSchema },
      responses: {
        204: { description: 'Участник убран' },
        ...errors({ ...memberErrors, 422: ['CANNOT_REMOVE_SELF'] }),
      },
    }),
    async (c) => {
      await service.removeMember(
        deps,
        c.get('boardId'),
        c.get('userId'),
        c.req.valid('param').userId,
      );
      return c.body(null, 204);
    },
  );

  return router;
}
