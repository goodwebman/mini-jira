// @vitest-environment node
/**
 * Тесткейсы:
 * - фильтр и Unicode в URL, ключах и реальном запросе;
 * - списки разных фильтров не делят кэш;
 * - детали включают участников; пустой id отключает запрос;
 * - ошибочный ответ и HTTP 403 отклоняются;
 * - отмена запроса передаётся транспорту.
 */
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';

import {
  boardQueryKeys,
  boardQueryOptions,
  boardsPath,
  boardsQueryOptions,
  fetchBoard,
  fetchBoards,
} from '../index';

const transport = vi.fn<typeof fetch>();
const json = (data: unknown, status = 200) => Response.json(data, { status });
const member = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Анна',
  job: 'Разработчик',
  colorIndex: 0,
  email: 'anna@example.com',
  role: 'admin',
  addedAt: '2026-11-01T00:00:00Z',
};
const board = {
  id: 9,
  key: 'GWT',
  name: 'Команда',
  description: '',
  colorIndex: 0,
  timezone: 'Europe/Moscow',
  isFavorite: false,
  myRole: 'admin',
  members: [member],
  currentSprint: {
    id: 's1',
    number: 1,
    state: 'active',
    startDate: '2026-11-02',
    endDate: '2026-11-13',
  },
};

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('board queries', () => {
  it('нормализует поиск одинаково для URL и ключа', () => {
    expect(boardsPath({ q: '  Я &  ', filter: 'favorite' })).toBe(
      '/boards?q=%D0%AF+%26&filter=favorite',
    );
    expect(boardQueryKeys.list({ q: '  Я &  ', filter: 'favorite' })).toEqual([
      'board',
      'list',
      { q: 'Я &', filter: 'favorite' },
    ]);
    expect(boardsPath()).toBe('/boards');
  });

  it('загружает разные фильтры в разные записи кэша', async () => {
    const client = new QueryClient();
    transport
      .mockResolvedValueOnce(json({ items: [], total: 2 }))
      .mockResolvedValueOnce(json({ items: [], total: 1 }));
    await expect(
      client.fetchQuery(boardsQueryOptions({ filter: 'all' })),
    ).resolves.toEqual({ items: [], total: 2 });
    await expect(
      client.fetchQuery(boardsQueryOptions({ filter: 'favorite' })),
    ).resolves.toEqual({ items: [], total: 1 });
    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/boards?filter=all',
      '/api/v1/boards?filter=favorite',
    ]);
    expect(client.getQueryData(boardQueryKeys.list({ filter: 'all' }))).toEqual(
      { items: [], total: 2 },
    );
    client.clear();
  });

  it('загружает детали и участников доски', async () => {
    transport.mockResolvedValue(json(board));
    await expect(fetchBoard(9)).resolves.toEqual(board);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/boards/9');
  });

  it.each([0, -1, NaN, 1.5])(
    'id %s отключает запрос, положительный id включает',
    (id) => {
      expect(boardQueryOptions(id).enabled).toBe(false);
      expect(boardQueryOptions(9).enabled).toBe(true);
    },
  );

  it('отклоняет ответ, который не соответствует контракту', async () => {
    transport.mockResolvedValue(json({ items: null, total: 0 }));
    await expect(fetchBoards()).rejects.toThrow();
  });

  it('сохраняет статус и тело HTTP-ошибки', async () => {
    transport.mockResolvedValue(
      json({ error: { code: 'ROLE_FORBIDDEN' } }, 403),
    );
    await expect(fetchBoards()).rejects.toMatchObject({
      status: 403,
      body: { error: { code: 'ROLE_FORBIDDEN' } },
    });
  });

  it('отмена query прерывает запрос и не записывает данные в кэш', async () => {
    const client = new QueryClient();
    let requestSignal: AbortSignal | undefined;
    transport.mockImplementation((_url, init) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) =>
        requestSignal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        ),
      );
    });
    const observer = new QueryObserver(client, boardsQueryOptions());
    const unsubscribe = observer.subscribe(() => undefined);
    expect(requestSignal?.aborted).toBe(false);
    await client.cancelQueries({ queryKey: boardQueryKeys.all });
    expect(requestSignal?.aborted).toBe(true);
    expect(client.getQueryData(boardQueryKeys.list())).toBeUndefined();
    unsubscribe();
    client.clear();
  });
});
