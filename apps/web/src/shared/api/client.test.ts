// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config';

import {
  apiClient,
  configureApiTransport,
  getConfiguredApiUrl,
  requireApiUrl,
} from './index';

const transport = vi.fn<typeof fetch>();
const publicFetch = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  transport.mockReset();
  publicFetch.mockReset();
  configureApiTransport(transport);
  vi.stubGlobal('fetch', publicFetch);
  vi.stubEnv('VITE_API_URL', ' /api/v1/// ');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('env и API URL', () => {
  it('читает и нормализует env при обращении', () => {
    expect(env.apiUrl).toBe('/api/v1///');
    expect(requireApiUrl()).toBe('/api/v1');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1/');
    expect(requireApiUrl()).toBe('https://api.example.com/api/v1');
  });

  it.each(['', '   ', '///'])(
    'пустой URL %j останавливает запрос',
    async (value) => {
      vi.stubEnv('VITE_API_URL', value);
      expect(getConfiguredApiUrl()).toBeNull();
      await expect(apiClient.get('/me')).rejects.toThrow('VITE_API_URL');
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it('отсутствующее значение env возвращает пустую строку', () => {
    vi.stubEnv('VITE_API_URL', undefined);
    expect(env.apiUrl).toBe('');
  });
});

describe('apiClient', () => {
  it('отправляет JSON через авторизованный транспорт и сохраняет signal и заголовки', async () => {
    transport.mockResolvedValue(json({ id: 1 }));
    const signal = new AbortController().signal;
    await expect(
      apiClient.post(
        'tasks',
        { title: 'Task' },
        {
          signal,
          headers: { 'X-Request-Id': 'r1' },
        },
      ),
    ).resolves.toEqual({ id: 1 });
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe('/api/v1/tasks');
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"title":"Task"}',
      signal,
    });
    const headers = new Headers(init?.headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-Id')).toBe('r1');
    expect(publicFetch).not.toHaveBeenCalled();
  });

  it.each(['get', 'delete', 'post', 'put', 'patch'] as const)(
    '%s задаёт HTTP-метод',
    async (method) => {
      transport.mockResolvedValue(new Response(null, { status: 204 }));
      await expect(apiClient[method]('/tasks/1')).resolves.toBeUndefined();
      expect(transport.mock.calls[0][1]?.method).toBe(method.toUpperCase());
    },
  );

  it('передаёт FormData без JSON и Content-Type, чтобы браузер добавил boundary', async () => {
    transport.mockResolvedValue(json({ ok: true }));
    const body = new FormData();
    body.append('file', new Blob(['content']), 'test.txt');
    await apiClient.post('/files', body);
    const init = transport.mock.calls[0][1];
    expect(init?.body).toBe(body);
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });

  it('skipAuth обходит транспорт с refresh', async () => {
    publicFetch.mockResolvedValue(json({ ok: true }));
    await apiClient.get('/public', { skipAuth: true });
    expect(publicFetch).toHaveBeenCalledOnce();
    expect(transport).not.toHaveBeenCalled();
    expect(publicFetch.mock.calls[0][1]).not.toHaveProperty('skipAuth');
  });

  it('сохраняет HTTP-статус и тело ошибки', async () => {
    transport.mockResolvedValue(json({ error: 'forbidden' }, 403));
    await expect(apiClient.get('/tasks')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      body: { error: 'forbidden' },
    });
  });

  it('сохраняет HTTP-статус при некорректном JSON в ошибке', async () => {
    transport.mockResolvedValue(
      new Response('{', {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(apiClient.get('/tasks')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
    });
  });

  it('ошибка сети пробрасывается вызывающему коду', async () => {
    const error = new TypeError('Failed to fetch');
    transport.mockRejectedValue(error);
    await expect(apiClient.get('/tasks')).rejects.toBe(error);
  });

  it('читает текстовый ответ', async () => {
    transport.mockResolvedValue(new Response('ok'));
    await expect(apiClient.get('/health')).resolves.toBe('ok');
  });
});
