import {
  createCommentBodySchema,
  taskCommentParamSchema,
  taskCommentSchema,
  taskKeyParamSchema,
  updateCommentBodySchema,
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
  const commentAction = requireAction('task.comment');
  const commentPath = '/tasks/{key}/comments/{commentId}';
  const commentErrors = {
    ...taskErrors,
    403: ['ROLE_FORBIDDEN'],
    404: ['TASK_NOT_FOUND', 'COMMENT_NOT_FOUND'],
  } as const;

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
      middleware: [taskAccess, commentAction],
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

  router.openapi(
    createRoute({
      method: 'patch',
      path: commentPath,
      operationId: 'updateTaskComment',
      tags: [TAG.comments],
      summary: 'Изменить свой комментарий',
      description:
        'Автор может изменить текст и упоминания. Администратор не может редактировать чужой комментарий. Гостю изменение запрещено.',
      security: bearerAuth,
      middleware: [taskAccess, commentAction],
      request: {
        params: taskCommentParamSchema,
        body: jsonBody(updateCommentBodySchema),
      },
      responses: {
        200: jsonResponse(taskCommentSchema, 'Комментарий изменён'),
        ...errors({ ...commentErrors, 422: ['VALIDATION_ERROR'] }),
      },
    }),
    async (c) =>
      c.json(
        await service.updateComment(
          deps,
          c.get('task').id,
          c.req.valid('param').commentId,
          c.get('userId'),
          c.get('boardRole'),
          c.req.valid('json'),
        ),
        200,
      ),
  );

  router.openapi(
    createRoute({
      method: 'delete',
      path: commentPath,
      operationId: 'deleteTaskComment',
      tags: [TAG.comments],
      summary: 'Удалить комментарий',
      description:
        'Автор удаляет свой комментарий, администратор — любой. Ответы сохраняются и переходят к родителю удалённого комментария. Гостю удаление запрещено.',
      security: bearerAuth,
      middleware: [taskAccess, commentAction],
      request: { params: taskCommentParamSchema },
      responses: {
        204: { description: 'Комментарий удалён' },
        ...errors(commentErrors),
      },
    }),
    async (c) => {
      await service.deleteComment(
        deps,
        c.get('task').id,
        c.req.valid('param').commentId,
        c.get('userId'),
        c.get('boardRole'),
      );
      return c.body(null, 204);
    },
  );

  return router;
}
