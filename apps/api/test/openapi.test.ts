import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@gwmt/contracts';
import { createTestApp, json, type TestApp } from './helpers.js';

const EXPECTED: [string, string][] = [
  ['get', '/health'],
  ['post', '/auth/register'],
  ['post', '/auth/login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['get', '/auth/github/start'],
  ['get', '/auth/github/callback'],
  ['get', '/auth/google/start'],
  ['get', '/auth/google/callback'],
  ['get', '/me'],
  ['patch', '/me'],
  ['post', '/me/password'],
  ['get', '/me/nav-summary'],
  ['get', '/me/task-stats'],
  ['get', '/me/tasks'],
  ['get', '/users/search'],
  ['get', '/boards'],
  ['post', '/boards'],
  ['get', '/boards/{boardId}'],
  ['put', '/boards/{boardId}/favorite'],
  ['delete', '/boards/{boardId}/favorite'],
  ['post', '/boards/{boardId}/members'],
  ['patch', '/boards/{boardId}/members/{userId}'],
  ['delete', '/boards/{boardId}/members/{userId}'],
  ['get', '/boards/{boardId}/tasks'],
  ['post', '/boards/{boardId}/tasks'],
  ['get', '/boards/{boardId}/sprints'],
  ['get', '/boards/{boardId}/sprints/{number}/kpi'],
  ['get', '/tasks/search'],
  ['get', '/tasks/{key}'],
  ['patch', '/tasks/{key}'],
  ['put', '/tasks/{key}/take-lock'],
  ['delete', '/tasks/{key}/take-lock'],
  ['post', '/tasks/{key}/pause'],
  ['post', '/tasks/{key}/resume'],
  ['post', '/tasks/{key}/links'],
  ['delete', '/tasks/{key}/links/{targetKey}'],
  ['post', '/tasks/{key}/comments'],
];

const NAMED_SCHEMAS = [
  'Me', 'AuthResponse', 'UserBrief', 'BoardMember', 'SprintBrief', 'BoardListItem', 'BoardListResponse',
  'BoardDetail', 'TaskTimer', 'TaskCard', 'BoardTasksResponse', 'TaskLinkItem', 'TaskComment', 'TaskDetail',
  'TaskRow', 'MyTasksResponse', 'TaskSearchItem', 'TaskSearchResponse', 'UserSearchResponse', 'NavSummary',
  'MyTaskStats', 'SprintListItem', 'SprintListResponse', 'SprintKpiDay', 'SprintKpi', 'HealthResponse',
  'ApiError', 'ErrorCode', 'TaskStatus', 'TaskPriority', 'TaskLinkType', 'TaskRole', 'BoardRole',
  'SprintState', 'Timezone', 'StageStatus', 'RegisterBody', 'LoginBody', 'UpdateMeBody',
  'ChangePasswordBody', 'CreateBoardBody', 'AddMemberBody', 'UpdateMemberBody', 'CreateTaskBody',
  'UpdateTaskBody', 'CreateLinkBody', 'CreateCommentBody',
];

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
}

interface Operation {
  operationId?: string;
  tags?: string[];
  summary?: string;
  security?: unknown[];
  parameters?: Parameter[];
  requestBody?: { content: Record<string, { schema: { $ref?: string } }> };
  responses: Record<string, { description: string; content?: Record<string, { schema: { $ref?: string } }> }>;
}

const PUBLIC_PREFIXES = ['/auth/', '/health'];

describe('OpenAPI', () => {
  let t: TestApp;
  let doc: {
    openapi: string;
    info: { description: string };
    tags: { name: string }[];
    paths: Record<string, Record<string, Operation>>;
    components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
  };

  const operations = () =>
    EXPECTED.map(([method, path]) => ({
      method,
      path,
      operation: doc.paths[`/api/v1${path}`]?.[method] as Operation,
    }));

  beforeAll(async () => {
    t = await createTestApp();
    const res = await t.request('GET', '/openapi.json');
    expect(res.status).toBe(200);
    doc = await json(res);
  });

  afterAll(() => t.close());

  it('версия 3.1', () => {
    expect(doc.openapi).toBe('3.1.0');
  });

  it('описаны все ручки контракта и лишних нет', () => {
    const documented = Object.entries(doc.paths).flatMap(([path, item]) =>
      Object.keys(item).map((method) => `${method} ${path.replace('/api/v1', '')}`),
    );
    expect(documented.sort()).toEqual(EXPECTED.map(([m, p]) => `${m} ${p}`).sort());
    expect(EXPECTED).toHaveLength(38);
  });

  it('ошибки Google описаны рядом с его callback', () => {
    const response = doc.paths['/api/v1/auth/google/callback']?.get?.responses['302'];
    for (const failure of ['denied', 'state_mismatch', 'no_verified_email', 'failed', 'email_not_trusted']) {
      expect(response?.description).toContain(`\`google_${failure}\``);
    }
    expect(doc.paths['/api/v1/auth/google/start']?.get?.operationId).toBe('startGoogleLogin');
    expect(doc.paths['/api/v1/auth/github/start']?.get?.operationId).toBe('startGithubLogin');
  });

  it.each(EXPECTED)('%s %s описана: группа и заголовок', (method, path) => {
    const operation = doc.paths[`/api/v1${path}`]?.[method];
    expect(operation?.tags?.length, 'tags').toBe(1);
    expect(operation?.summary, 'summary').toBeTruthy();
    expect(doc.tags.map((tag) => tag.name)).toContain(operation?.tags?.[0]);
  });

  it.each(NAMED_SCHEMAS)('схема %s именована', (name) => {
    expect(doc.components.schemas).toHaveProperty(name);
  });

  it('защищённые ручки помечены bearerAuth и документируют 401', () => {
    for (const { method, path, operation } of operations()) {
      if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
      expect(operation.security, `${method} ${path}`).toEqual([{ bearerAuth: [] }]);
      expect(operation.responses['401']?.description, `${method} ${path}`).toContain('ACCESS_TOKEN_EXPIRED');
    }
  });

  it('публичные ручки явно не требуют токена', () => {
    expect(doc.paths['/api/v1/auth/login']?.post?.security).toEqual([]);
    expect(doc.paths['/api/v1/auth/github/start']?.get?.security).toEqual([]);
    expect(doc.paths['/api/v1/health']?.get?.security).toEqual([]);
  });

  it('у каждой ручки уникальный operationId', () => {
    const ids = operations().map(({ operation }) => operation.operationId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('null не запрещён через allOf', () => {
    const offenders: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node !== 'object' || node === null) return;
      const allOf = (node as { allOf?: { type?: unknown }[] }).allOf;
      if (allOf?.some((part) => Array.isArray(part.type) && part.type.includes('null'))) {
        offenders.push(path);
      }
      for (const [key, value] of Object.entries(node)) walk(value, `${path}/${key}`);
    };
    walk(doc, '');
    expect(offenders).toEqual([]);
  });

  it('необязательная роль в карточке задачи описана как ссылка или null', () => {
    const schemas = doc.components.schemas as Record<string, any>;
    expect(schemas.TaskCard.properties.people.properties.tester).toEqual({
      anyOf: [{ $ref: '#/components/schemas/UserBrief' }, { type: 'null' }],
    });
  });

  it('refresh и logout описаны через cookie', () => {
    expect(doc.components.securitySchemes).toHaveProperty('refreshCookie');
    expect(doc.paths['/api/v1/auth/refresh']?.post?.security).toEqual([{ refreshCookie: [] }]);
    expect(doc.paths['/api/v1/auth/logout']?.post?.security).toEqual([{ refreshCookie: [] }]);
  });

  it('параметры пути обязательны', () => {
    for (const { method, path, operation } of operations()) {
      for (const parameter of operation.parameters ?? []) {
        if (parameter.in === 'path') expect(parameter.required, `${method} ${path}`).toBe(true);
      }
      const names = [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      const declared = (operation.parameters ?? []).filter((p) => p.in === 'path').map((p) => p.name);
      expect(declared.sort(), `${method} ${path}`).toEqual(names.sort());
    }
  });

  it('тела запросов и ответы ссылаются на именованные схемы', () => {
    for (const { method, path, operation } of operations()) {
      const body = operation.requestBody?.content['application/json']?.schema;
      if (body) expect(body.$ref, `${method} ${path} тело`).toMatch(/^#\/components\/schemas\//);

      for (const [status, response] of Object.entries(operation.responses)) {
        const schema = response.content?.['application/json']?.schema;
        if (schema) expect(schema.$ref, `${method} ${path} ${status}`).toMatch(/^#\/components\/schemas\//);
      }
    }
  });

  it('у каждой ручки описан ровно один успешный ответ', () => {
    for (const { method, path, operation } of operations()) {
      const success = Object.keys(operation.responses).filter((status) => /^[23]/.test(status));
      expect(success.length, `${method} ${path}`).toBe(1);
    }
  });

  it('каждый код ошибки упомянут хотя бы на одной ручке', () => {
    const descriptions = operations()
      .flatMap(({ operation }) => Object.values(operation.responses))
      .map((response) => response.description)
      .join('\n');
    for (const code of ERROR_CODES) {
      if (code === 'BAD_REQUEST' || code === 'INTERNAL_ERROR') continue;
      expect(descriptions, code).toContain(`\`${code}\``);
    }
  });

  it('коды ошибок приведены вместе с текстом для пользователя', () => {
    const response = doc.paths['/api/v1/tasks/{key}']?.patch?.responses['403'];
    expect(response?.description).toContain('`TASK_TAKE_LOCKED`: Администратор запретил брать эту задачу в работу');
  });

  it('документ компактный: схемы не вставлены inline', () => {
    expect(JSON.stringify(doc).length).toBeLessThan(200_000);
  });

  it('обзор содержит правила токенов, ролей и кэша', () => {
    expect(doc.info.description).toContain('ACCESS_TOKEN_EXPIRED');
    expect(doc.info.description).toContain('| Двигать статус |');
    expect(doc.info.description).toContain('Что обновить на фронте');
  });

  it('Swagger UI открывается без токена и смотрит на /openapi.json', async () => {
    const res = await t.request('GET', '/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('/api/v1/openapi.json');
    expect(html, 'версия Swagger UI закреплена').toMatch(/swagger-ui-dist@\d+\.\d+\.\d+/);
  });

  it('docs/openapi.json не разошёлся с кодом', () => {
    const file = readFileSync(resolve(import.meta.dirname, '../../../docs/openapi.json'), 'utf8');
    expect(JSON.parse(file), 'запустите npm run openapi').toEqual(doc);
  });
});
