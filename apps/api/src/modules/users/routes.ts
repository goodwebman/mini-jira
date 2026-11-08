import { userSearchQuerySchema, userSearchResponseSchema } from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import { ACCESS_ERRORS, bearerAuth, createRouter, errors, jsonResponse } from '../../lib/router.js';
import * as service from './service.js';

export function usersRoutes(deps: AppDeps) {
  const router = createRouter();

  router.openapi(
    createRoute({
      method: 'get',
      path: '/users/search',
      operationId: 'searchUsers',
      tags: [TAG.users],
      summary: 'Поиск людей',
      description:
        'До 20 человек, себя в выдаче нет, email не отдаётся. При пустом `q` возвращаются люди с других досок текущего пользователя.',
      security: bearerAuth,
      request: { query: userSearchQuerySchema },
      responses: {
        200: jsonResponse(userSearchResponseSchema, 'Найденные люди'),
        ...errors({ 401: ACCESS_ERRORS, 403: ['ROLE_FORBIDDEN'], 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(await service.searchUsers(deps, c.get('userId'), c.req.valid('query')), 200),
  );

  return router;
}
