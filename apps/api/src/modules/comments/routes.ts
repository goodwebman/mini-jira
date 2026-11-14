import {
  createCommentBodySchema,
  taskCommentSchema,
  taskKeyParamSchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';

import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import {
  bearerAuth,
  createRouter,
  errors,
  jsonBody,
  jsonResponse,
  taskErrors,
} from '../../lib/router.js';
import { requireAction, requireTaskAccess } from '../boards/access.js';
import * as service from './service.js';

export function commentsRoutes(deps: AppDeps) {
  const router = createRouter();
  const taskAccess = requireTaskAccess(deps);

  router.openapi(
    createRoute({
      method: 'post',
      path: '/tasks/{key}/comments',
      operationId: 'createTaskComment',
      tags: [TAG.comments],
      summary: 'Добавить комментарий',
      description:
        'Комментируют администратор и рабочий доски, гость получает 403. Пробелы по краям текста отбрасываются.',
      security: bearerAuth,
      middleware: [taskAccess, requireAction('task.comment')],
      request: {
        params: taskKeyParamSchema,
        body: jsonBody(createCommentBodySchema),
      },
      responses: {
        201: jsonResponse(taskCommentSchema, 'Комментарий добавлен'),
        ...errors({
          ...taskErrors,
          403: ['ROLE_FORBIDDEN'],
          422: ['VALIDATION_ERROR'],
        }),
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
