// Здесь нельзя импортировать из голого пакета hono, даже типы. Vercel выбирает точкой входа
// первый файл с таким импортом, и src/app.ts проверяется раньше src/index.ts.
import { healthResponseSchema } from '@gwmt/contracts';
import { swaggerUI } from '@hono/swagger-ui';
import { createRoute } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';

import { API_DOCUMENT, TAG } from './lib/api-docs.js';
import type { AppDeps } from './lib/context.js';
import { handleError, handleNotFound } from './lib/errors.js';
import { createRouter, errors, jsonResponse, noAuth } from './lib/router.js';
import { requireAuth } from './modules/auth/middleware.js';
import { authRoutes } from './modules/auth/routes.js';
import { boardsRoutes } from './modules/boards/routes.js';
import { meRoutes } from './modules/me/routes.js';
import { sprintsRoutes } from './modules/sprints/routes.js';
import { tasksRoutes } from './modules/tasks/routes.js';
import { usersRoutes } from './modules/users/routes.js';

export type { AppDeps } from './lib/context.js';

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  operationId: 'getHealth',
  tags: [TAG.service],
  summary: 'Проверка сервиса и базы',
  description: 'Делает запрос в базу. Токен не нужен.',
  security: noAuth,
  responses: {
    200: jsonResponse(healthResponseSchema, 'Сервис и база доступны'),
    ...errors({ 500: ['INTERNAL_ERROR'] }),
  },
});

export function createApp(deps: AppDeps) {
  const root = createRouter();

  root.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    await next();
    c.res.headers.set('X-Request-Id', requestId);
    c.res.headers.set('Cache-Control', 'no-store');
  });

  const app = root.basePath('/api/v1');
  app.onError(handleError);
  app.notFound(handleNotFound);
  app.use('*', requireAuth(deps));

  app.route('/', authRoutes(deps));
  app.route('/', meRoutes(deps));
  app.route('/', usersRoutes(deps));
  app.route('/', boardsRoutes(deps));
  app.route('/', sprintsRoutes(deps));
  app.route('/', tasksRoutes(deps));

  app.openapi(healthRoute, async (c) => {
    await deps.db.execute(sql`select 1`);
    // Шаг 1: первый деплой должен проверить оба драйвера. После приёмки деплоя withTx отсюда уйдёт.
    await deps.withTx((tx) => tx.execute(sql`select 1`));
    return c.json(
      { status: 'ok' as const, time: deps.now().toISOString() },
      200,
    );
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access-токен из AuthResponse',
  });
  app.openAPIRegistry.registerComponent('securitySchemes', 'refreshCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: 'gwmt_refresh',
    description: 'Браузер отправляет сам, фронту значение недоступно',
  });

  app.doc31('/openapi.json', API_DOCUMENT);
  app.get(
    '/docs',
    swaggerUI({
      url: '/api/v1/openapi.json',
      version: '5.34.1',
      title: 'goodWebManTasks API',
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    }),
  );

  return app;
}
