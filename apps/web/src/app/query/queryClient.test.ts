// @vitest-environment node
/**
 * Тесткейсы:
 * - окончательные HTTP/auth ошибки не повторяются, временные повторяются один раз;
 * - мутации автоматически не повторяются;
 * - обновление токена сохраняет кэш, logout/kick/смена пользователя очищают;
 * - очистка сессии отменяет запрос и не допускает позднюю запись старых данных.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AuthError,
  type AuthEvent,
  bindAuthToQueryClient,
} from '@/entities/auth/lib';
import { AuthStore } from '@/entities/auth/lib/auth-store';
import { boardsQueryOptions } from '@/entities/board';
import { HttpError, configureApiTransport } from '@/shared/api';

import { createQueryClient } from './queryClient';

afterEach(() => vi.unstubAllEnvs());

describe('application query client', () => {
  it.each([400, 401, 403, 404, 409, 422])(
    'HTTP %s не повторяется',
    async (status) => {
      const client = createQueryClient();
      const error = new HttpError(new Response(null, { status }), null);
      const queryFn = vi.fn().mockRejectedValue(error);
      await expect(
        client.fetchQuery({ queryKey: ['failure'], queryFn, retryDelay: 0 }),
      ).rejects.toBe(error);
      expect(queryFn).toHaveBeenCalledTimes(1);
      client.clear();
    },
  );

  it.each([429, 500, 503])('HTTP %s повторяется один раз', async (status) => {
    const client = createQueryClient();
    const error = new HttpError(new Response(null, { status }), null);
    const queryFn = vi.fn().mockRejectedValue(error);
    await expect(
      client.fetchQuery({ queryKey: ['failure'], queryFn, retryDelay: 0 }),
    ).rejects.toBe(error);
    expect(queryFn).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('окончательная auth-ошибка не запускает повторный запрос', async () => {
    const client = createQueryClient();
    const error = new AuthError('unauthorized');
    const queryFn = vi.fn().mockRejectedValue(error);
    await expect(
      client.fetchQuery({ queryKey: ['auth'], queryFn, retryDelay: 0 }),
    ).rejects.toBe(error);
    expect(queryFn).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('ошибка сети повторяется один раз и возвращает успешный ответ', async () => {
    const client = createQueryClient();
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValueOnce({ items: [] });
    await expect(
      client.fetchQuery({ queryKey: ['network'], queryFn, retryDelay: 0 }),
    ).resolves.toEqual({ items: [] });
    expect(queryFn).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('ошибка мутации не вызывает повторную запись', async () => {
    const client = createQueryClient();
    const error = new TypeError('Offline');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const mutation = client.getMutationCache().build(client, { mutationFn });
    await expect(mutation.execute(undefined)).rejects.toBe(error);
    expect(mutationFn).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it.each(['logout', 'kick', 'login'] as const)(
    '%s очищает кэш, renewed сохраняет',
    (type) => {
      const client = createQueryClient();
      const store = new AuthStore<unknown>(() => undefined);
      const unbind = bindAuthToQueryClient(store, client);
      client.setQueryData(['profile', 'detail'], {
        name: 'Предыдущий пользователь',
      });
      store.emit({ type: 'renewed', state: store.state });
      expect(client.getQueryData(['profile', 'detail'])).toEqual({
        name: 'Предыдущий пользователь',
      });
      const event: AuthEvent<unknown> =
        type === 'login'
          ? { type, state: store.state, origin: 'local', identityChanged: true }
          : type === 'kick'
            ? {
                type,
                state: store.state,
                origin: 'local',
                reason: 'unauthorized',
                error: null,
              }
            : { type, state: store.state, origin: 'local' };
      store.emit(event);
      expect(client.getQueryData(['profile', 'detail'])).toBeUndefined();
      unbind();
      client.clear();
    },
  );

  it('выход отменяет запрос и поздний ответ не возвращает данные в кэш', async () => {
    vi.stubEnv('VITE_API_URL', '/api/v1');
    const client = createQueryClient();
    const store = new AuthStore<unknown>(() => undefined);
    const unbind = bindAuthToQueryClient(store, client);
    let resolveRequest!: (response: Response) => void;
    let signal: AbortSignal | null | undefined;
    configureApiTransport((_url, init) => {
      signal = init?.signal;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    });
    const request = client.fetchQuery(boardsQueryOptions());
    const rejected = expect(request).rejects.toThrow();
    expect(signal?.aborted).toBe(false);
    store.emit({ type: 'logout', state: store.state, origin: 'local' });
    expect(signal?.aborted).toBe(true);
    resolveRequest(Response.json({ items: [], total: 99 }));
    await rejected;
    expect(client.getQueryCache().getAll()).toEqual([]);
    unbind();
    client.clear();
  });
});
