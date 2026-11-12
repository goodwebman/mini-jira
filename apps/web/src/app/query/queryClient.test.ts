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

import { bindQueryClientToasts, createQueryClient } from './queryClient';

afterEach(() => vi.unstubAllEnvs());

describe('application query client', () => {
  it('показывает один тост после исчерпания повторных попыток запроса', async () => {
    const client = createQueryClient();
    const toast = vi.fn();
    const unbind = bindQueryClientToasts(client, toast);
    const error = new HttpError(new Response(null, { status: 503 }), {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Сервис временно недоступен',
        requestId: 'req-1',
      },
    });
    const queryFn = vi.fn().mockRejectedValue(error);

    await expect(
      client.fetchQuery({ queryKey: ['toast'], queryFn, retryDelay: 0 }),
    ).rejects.toBe(error);

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenCalledExactlyOnceWith('Сервис временно недоступен');
    unbind();
    client.clear();
  });

  it('показывает ошибку мутации и отписывается от обоих кэшей', async () => {
    const client = createQueryClient();
    const toast = vi.fn();
    const unbind = bindQueryClientToasts(client, toast);
    const error = new AuthError('network');
    const mutationFn = vi.fn().mockRejectedValue(error);
    await expect(
      client
        .getMutationCache()
        .build(client, { mutationFn })
        .execute(undefined),
    ).rejects.toBe(error);
    expect(toast).toHaveBeenCalledExactlyOnceWith('Нет соединения с сервером');

    unbind();
    toast.mockClear();
    await expect(
      client
        .getMutationCache()
        .build(client, { mutationFn })
        .execute(undefined),
    ).rejects.toBe(error);
    await expect(
      client.fetchQuery({
        queryKey: ['unbound'],
        queryFn: mutationFn,
        retry: false,
      }),
    ).rejects.toBe(error);
    expect(toast).not.toHaveBeenCalled();
    client.clear();
  });

  it.each([
    new AuthError('aborted'),
    new AuthError('session_changed'),
    new DOMException('Aborted', 'AbortError'),
  ])('не показывает тост для отменённой операции: %s', async (error) => {
    const client = createQueryClient();
    const toast = vi.fn();
    const unbind = bindQueryClientToasts(client, toast);
    await expect(
      client.fetchQuery({
        queryKey: ['cancelled'],
        queryFn: () => Promise.reject(error),
        retry: false,
      }),
    ).rejects.toBe(error);
    expect(toast).not.toHaveBeenCalled();
    unbind();
    client.clear();
  });

  it('не показывает тост, если повторный запрос успешен или запрос отменён клиентом', async () => {
    const client = createQueryClient();
    const toast = vi.fn();
    const unbind = bindQueryClientToasts(client, toast);
    await client.fetchQuery({
      queryKey: ['recovered'],
      queryFn: vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Offline'))
        .mockResolvedValueOnce([]),
      retryDelay: 0,
    });
    const request = client.fetchQuery({
      queryKey: ['pending'],
      queryFn: () => new Promise(() => {}),
    });
    const rejected = expect(request).rejects.toThrow();
    await client.cancelQueries({ queryKey: ['pending'] });
    await rejected;
    expect(toast).not.toHaveBeenCalled();
    unbind();
    client.clear();
  });

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
