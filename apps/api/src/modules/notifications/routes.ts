import {
  notificationIdParamSchema,
  notificationsQuerySchema,
  notificationsResponseSchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';

import { TAG } from '../../lib/api-docs.js';
import type { AppDeps } from '../../lib/context.js';
import {
  ACCESS_ERRORS,
  bearerAuth,
  createRouter,
  errors,
  jsonResponse,
} from '../../lib/router.js';
import * as service from './service.js';

export function notificationsRoutes(deps: AppDeps) {
  const router = createRouter();
  const common = { tags: [TAG.notifications], security: bearerAuth };
  const failures = errors({
    400: ['BAD_REQUEST'],
    401: ACCESS_ERRORS,
    422: ['VALIDATION_ERROR'],
  });

  router.openapi(
    createRoute({
      ...common,
      method: 'get',
      path: '/notifications',
      operationId: 'listNotifications',
      summary: 'Список уведомлений и число непрочитанных',
      request: { query: notificationsQuerySchema },
      responses: {
        200: jsonResponse(notificationsResponseSchema, 'Уведомления'),
        ...failures,
      },
    }),
    async (c) =>
      c.json(
        await service.listNotifications(
          deps,
          c.get('userId'),
          c.req.valid('query'),
        ),
        200,
      ),
  );

  router.openapi(
    createRoute({
      ...common,
      method: 'put',
      path: '/notifications/read',
      operationId: 'markAllNotificationsRead',
      summary: 'Прочитать все уведомления',
      responses: { 204: { description: 'Прочитаны' }, ...failures },
    }),
    async (c) => {
      await service.markNotificationRead(deps, c.get('userId'));
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      ...common,
      method: 'put',
      path: '/notifications/{id}/read',
      operationId: 'markNotificationRead',
      summary: 'Прочитать уведомление',
      request: { params: notificationIdParamSchema },
      responses: { 204: { description: 'Прочитано' }, ...failures },
    }),
    async (c) => {
      await service.markNotificationRead(
        deps,
        c.get('userId'),
        c.req.valid('param').id,
      );
      return c.body(null, 204);
    },
  );

  router.openapi(
    createRoute({
      ...common,
      method: 'delete',
      path: '/notifications/{id}',
      operationId: 'deleteNotification',
      summary: 'Удалить уведомление',
      request: { params: notificationIdParamSchema },
      responses: { 204: { description: 'Удалено' }, ...failures },
    }),
    async (c) => {
      await service.deleteNotification(
        deps,
        c.get('userId'),
        c.req.valid('param').id,
      );
      return c.body(null, 204);
    },
  );
  return router;
}
