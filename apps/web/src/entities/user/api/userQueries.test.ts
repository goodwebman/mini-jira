// @vitest-environment node
/** Тесткейсы: Unicode/исключение доски; пустой поиск; один символ отключает query, два включают; 403; неверный ответ. */
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchUsers, userQueryKeys, userSearchPath, userSearchQueryOptions } from '../index';
import { configureApiTransport } from '@/shared/api';

const transport = vi.fn<typeof fetch>();
beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('user search', () => {
  it('URL и ключ учитывают нормализованный поиск и исключённую доску', () => {
    expect(userSearchPath({ q: ' Анна & ', excludeBoardId: 9 })).toBe('/users/search?q=%D0%90%D0%BD%D0%BD%D0%B0+%26&excludeBoardId=9');
    expect(userQueryKeys.search({ q: ' Анна & ', excludeBoardId: 9 })).toEqual(['user', 'search', { q: 'Анна &', excludeBoardId: 9 }]);
    expect(userSearchPath()).toBe('/users/search');
  });

  it('один символ не отправляется, два включают поиск', async () => {
    const client = new QueryClient();
    const observer = new QueryObserver(client, userSearchQueryOptions({ q: ' А ' }));
    const unsubscribe = observer.subscribe(() => undefined);
    expect(transport).not.toHaveBeenCalled();
    const data = { items: [{ id: 'u1', name: 'Анна', job: '', colorIndex: 0 }] };
    transport.mockResolvedValue(Response.json(data));
    observer.setOptions(userSearchQueryOptions({ q: ' Ан ' }));
    await expect(client.fetchQuery(userSearchQueryOptions({ q: 'Ан' }))).resolves.toEqual(data);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/users/search?q=%D0%90%D0%BD');
    unsubscribe();
    client.clear();
  });

  it('пустой поиск загружает людей с других досок', async () => {
    const client = new QueryClient();
    transport.mockResolvedValue(Response.json({ items: [] }));
    expect(userSearchQueryOptions().enabled).toBe(true);
    await expect(client.fetchQuery(userSearchQueryOptions())).resolves.toEqual({ items: [] });
    expect(transport.mock.calls[0][0]).toBe('/api/v1/users/search');
    client.clear();
  });

  it('403 не превращается в пустой список', async () => {
    transport.mockResolvedValue(Response.json({ error: { code: 'ROLE_FORBIDDEN' } }, { status: 403 }));
    await expect(searchUsers({ excludeBoardId: 9 })).rejects.toMatchObject({ status: 403 });
  });

  it('не принимает список без обязательных полей пользователя', async () => {
    transport.mockResolvedValue(Response.json({ items: [{ id: 'u1' }] }));
    await expect(searchUsers()).rejects.toThrow();
  });
});
