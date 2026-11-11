// @vitest-environment node
/**
 * Тесткейсы: фильтры/пагинация в URL и ключах; defaults из contracts;
 * запросы задач доски, деталей и поиска; отключение неверного ключа;
 * валидация границ до сети; сетевые и некорректные ответы.
 */
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  boardTasksQueryOptions, fetchTask, myTasksPath, myTasksQueryOptions,
  taskQueryKeys, taskQueryOptions, taskSearchPath, taskSearchQueryOptions,
} from '../index';
import { configureApiTransport } from '@/shared/api';

const transport = vi.fn<typeof fetch>();
beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('task queries', () => {
  it('включает все фильтры и страницу в URL и ключ', () => {
    const params = { q: ' GWT & ', status: 'work' as const, role: 'reviewer' as const, page: 2, pageSize: 10 };
    expect(myTasksPath(params)).toBe('/me/tasks?q=GWT+%26&status=work&role=reviewer&page=2&pageSize=10');
    expect(taskQueryKeys.my(params)).toEqual(['task', 'my', { q: 'GWT &', status: 'work', role: 'reviewer', page: 2, pageSize: 10 }]);
    expect(taskQueryKeys.my()).toEqual(['task', 'my', { page: 1, pageSize: 50 }]);
    expect(taskQueryKeys.my({ page: 1, pageSize: 50 })).toEqual(taskQueryKeys.my());
  });

  it('поиск учитывает excludeLinkedTo и limit', () => {
    expect(taskSearchPath({ q: ' API? ', excludeLinkedTo: 'GWT-1', limit: 20 }))
      .toBe('/tasks/search?q=API%3F&excludeLinkedTo=GWT-1&limit=20');
    expect(taskQueryKeys.search({ q: ' API? ', excludeLinkedTo: 'GWT-1', limit: 20 }))
      .toEqual(['task', 'search', { q: 'API?', excludeLinkedTo: 'GWT-1', limit: 20 }]);
    expect(taskSearchPath()).toBe('/tasks/search?limit=6');
  });

  it('загружает страницу моих задач через queryOptions', async () => {
    const client = new QueryClient();
    const page = { items: [], page: 2, pageSize: 10, total: 0, summary: { totalCount: 0, totalSp: 0 }, serverTime: '2026-11-11T00:00:00Z' };
    transport.mockResolvedValue(Response.json(page));
    await expect(client.fetchQuery(myTasksQueryOptions({ page: 2, pageSize: 10 }))).resolves.toEqual(page);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/me/tasks?page=2&pageSize=10');
    client.clear();
  });

  it('загружает спринт и задачи доски', async () => {
    const client = new QueryClient();
    const data = { sprint: { id: 's1', number: 1, state: 'active', startDate: '2026-11-02', endDate: '2026-11-13' }, items: [], serverTime: '2026-11-11T00:00:00Z' };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(boardTasksQueryOptions(9))).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/boards/9/tasks');
    client.clear();
  });

  it('поиск с пустым q остаётся доступен', async () => {
    const client = new QueryClient();
    const data = { items: [{ key: 'GWT-1', title: 'Задача', status: 'todo', board: { id: 9, name: 'Команда' } }] };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(taskSearchQueryOptions())).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/tasks/search?limit=6');
    client.clear();
  });

  it.each(['', 'search', 'GWT-0/links', 'gwt-1'])('неверный ключ %j отключает query', (key) => {
    expect(taskQueryOptions(key).enabled).toBe(false);
    expect(taskQueryOptions('GWT-1').enabled).toBe(true);
  });

  it.each([0, 101])('pageSize %s не проходит валидацию', (pageSize) => {
    expect(() => myTasksPath({ pageSize })).toThrow();
    expect(myTasksPath({ pageSize: 100 })).toBe('/me/tasks?page=1&pageSize=100');
  });

  it('некорректные детали отклоняются, ключ кодируется как сегмент пути', async () => {
    transport.mockResolvedValue(Response.json({ key: 'GWT-1' }));
    await expect(fetchTask('GWT-1/links')).rejects.toThrow();
    expect(transport.mock.calls[0][0]).toBe('/api/v1/tasks/GWT-1%2Flinks');
  });

  it('сетевая ошибка доходит до вызывающего кода', async () => {
    const error = new TypeError('Offline');
    transport.mockRejectedValue(error);
    await expect(fetchTask('GWT-1')).rejects.toBe(error);
  });
});
