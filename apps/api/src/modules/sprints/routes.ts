import {
  boardIdParamSchema,
  sprintKpiSchema,
  sprintListResponseSchema,
  sprintNumberParamSchema,
  sprintsQuerySchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import {
  bearerAuth,
  boardErrors,
  createRouter,
  errors,
  jsonResponse,
} from '../../lib/router.js';
import { requireBoardMember } from '../boards/access.js';
import { getSprintKpi, listBoardSprints } from '../kpi/service.js';

const tags = [TAG.sprints];

export function sprintsRoutes(deps: AppDeps) {
  const router = createRouter();
  const member = requireBoardMember(deps);

  router.openapi(
    createRoute({
      method: 'get',
      path: '/boards/{boardId}/sprints',
      operationId: 'listBoardSprints',
      tags,
      summary: 'Спринты доски',
      description: 'От новых к старым.',
      security: bearerAuth,
      middleware: [member],
      request: { params: boardIdParamSchema, query: sprintsQuerySchema },
      responses: {
        200: jsonResponse(sprintListResponseSchema, 'Список спринтов'),
        ...errors({ ...boardErrors, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(
        { items: await listBoardSprints(deps, c.get('boardId'), c.req.valid('query').limit) },
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: '/boards/{boardId}/sprints/{number}/kpi',
      operationId: 'getSprintKpi',
      tags,
      summary: 'KPI спринта',
      description:
        'Для активного спринта считается по текущим данным, для закрытого читается из снимка и после закрытия не меняется. ' +
        'В массиве `days` всегда 10 дней, у будущих поля факта равны `null`.',
      security: bearerAuth,
      middleware: [member],
      request: { params: sprintNumberParamSchema },
      responses: {
        200: jsonResponse(sprintKpiSchema, 'KPI'),
        ...errors({ ...boardErrors, 404: ['BOARD_NOT_FOUND', 'SPRINT_NOT_FOUND'] }),
      },
    }),
    async (c) =>
      c.json(await getSprintKpi(deps, c.get('boardId'), c.req.valid('param').number), 200),
  );

  return router;
}
