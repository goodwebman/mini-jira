// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { AuthError } from '../errors';
import {
  createAuth,
  createSignedIn,
  deferred,
  flush,
  makeGrant,
  makeUser,
  SELF_ORIGIN,
  type TestGrant,
} from '../testing/test-kit';
import { attachAuthToAxios, type AxiosLike } from './axios';
import { createAuthFetch } from './fetch';
import { graphqlEffectiveStatus } from './graphql';
import { bindAuthToRtkQuery } from './rtk-query';
import { bindAuthToQueryClient, shouldRetryQuery } from './tanstack-query';

const URL_OK = `${SELF_ORIGIN}/api/tasks`;

function createBackend(...acceptedTokens: string[]) {
  const accepted = new Set(acceptedTokens.map((token) => `Bearer ${token}`));
  const requests: Request[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input as Request;
    requests.push(request);
    const authorization = request.headers.get('Authorization');
    return new Response(JSON.stringify({ ok: true }), {
      status: authorization !== null && accepted.has(authorization) ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, spy: fetch, requests };
}

async function signedInFetch(...tokens: string[]) {
  const backend = createBackend(...tokens);
  const context = await createSignedIn();
  return { ...context, ...backend, authFetch: createAuthFetch(context.auth, { fetch: backend.fetch }) };
}

describe('createAuthFetch', () => {
  it('blocks redirects for requests with credentials, including custom headers', async () => {
    const { authFetch, requests } = await signedInFetch('first-token');
    await authFetch(URL_OK, { redirect: 'follow' });
    expect(requests[0]?.redirect).toBe('error');
  });
  it('добавляет заголовок и сохраняет метод, тело и свои заголовки', async () => {
    const { authFetch, requests } = await signedInFetch('first-token');
    await authFetch(URL_OK, {
      method: 'POST',
      headers: { 'X-Custom': '1', 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
    const [request] = requests;
    expect(request?.method).toBe('POST');
    expect(request?.headers.get('Authorization')).toBe('Bearer first-token');
    expect(request?.headers.get('X-Custom')).toBe('1');
    await expect(request?.text()).resolves.toBe('{"a":1}');
  });

  it('401: обновляет токен и повторяет запрос с тем же телом', async () => {
    const { authFetch, requests } = await signedInFetch('renewed-token');
    const response = await authFetch(URL_OK, { method: 'POST', body: 'payload' });

    expect(response.status).toBe(200);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.headers.get('Authorization')).toBe('Bearer renewed-token');
    await expect(requests[0]?.text()).resolves.toBe('payload');
    await expect(requests[1]?.text()).resolves.toBe('payload');
  });

  it('потоковое тело тоже воспроизводится при повторе', async () => {
    const { authFetch, requests } = await signedInFetch('renewed-token');
    const body = new Blob(['stream-payload']).stream();
    const response = await authFetch(URL_OK, { method: 'POST', body, duplex: 'half' } as RequestInit);

    expect(response.status).toBe(200);
    await expect(requests[1]?.text()).resolves.toBe('stream-payload');
  });

  it('FormData воспроизводится при повторе', async () => {
    const { authFetch, requests } = await signedInFetch('renewed-token');
    const form = new FormData();
    form.set('title', 'Задача');
    await authFetch(URL_OK, { method: 'POST', body: form });
    expect((await requests[1]?.formData())?.get('title')).toBe('Задача');
  });

  it('тело первого ответа освобождается перед повтором', async () => {
    const cancel = vi.fn(async () => undefined);
    const first = new Response('denied', { status: 401 });
    Object.defineProperty(first, 'body', { value: { cancel } });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(first)
      .mockResolvedValue(new Response('ok'));
    const { auth } = await createSignedIn();
    await createAuthFetch(auth, { fetch })(URL_OK);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('сессия закончилась: возвращает 401, а не исключение (контракт fetch)', async () => {
    const { auth, eventTypes } = await createSignedIn({
      strategy: {
        renew: vi.fn(async () => {
          throw AuthError.fromStatus(401);
        }),
      },
    });
    const backend = createBackend();
    const response = await createAuthFetch(auth, { fetch: backend.fetch })(URL_OK);
    expect(response.status).toBe(401);
    expect(eventTypes()).toEqual(['kick']);
  });

  it('сеть упала на refresh: AuthError, запрос можно повторить', async () => {
    const { auth } = await createSignedIn({
      strategy: {
        renew: vi.fn(async () => {
          throw new TypeError('Failed to fetch');
        }),
      },
    });
    const backend = createBackend();
    await expect(createAuthFetch(auth, { fetch: backend.fetch })(URL_OK)).rejects.toMatchObject({
      code: 'network',
      retryable: true,
    });
  });

  it('чужой origin: токена нет, запрос тот же самый', async () => {
    const { authFetch, requests } = await signedInFetch();
    await authFetch('https://cdn.other.test/file.json');
    expect(requests[0]?.headers.has('Authorization')).toBe(false);
  });

  it('относительный URL разрешается и подписывается', async () => {
    const { authFetch, requests } = await signedInFetch('first-token');
    await authFetch('/api/me');
    expect(requests[0]?.url).toBe(`${SELF_ORIGIN}/api/me`);
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer first-token');
  });

  it('принимает URL и Request', async () => {
    const { authFetch, requests } = await signedInFetch('first-token');
    await authFetch(new URL(URL_OK));
    await authFetch(new Request(URL_OK, { method: 'DELETE' }));
    expect(requests[0]?.url).toBe(URL_OK);
    expect(requests[1]?.method).toBe('DELETE');
    expect(requests[1]?.headers.get('Authorization')).toBe('Bearer first-token');
  });

  it('skipAuth отправляет без токена и не передаётся в fetch', async () => {
    const { authFetch, requests } = await signedInFetch();
    await authFetch(URL_OK, { skipAuth: true });
    expect(requests[0]?.headers.has('Authorization')).toBe(false);
  });

  it('режим credentials задаёт стратегия', async () => {
    const backend = createBackend();
    const { auth } = await createSignedIn({
      strategy: { decorate: () => ({ credentialsMode: 'include' }) },
    });
    await createAuthFetch(auth, { fetch: backend.fetch })(URL_OK);
    expect(backend.requests[0]?.credentials).toBe('include');
  });

  it('отмена запроса во время ожидания refresh пробрасывает AbortError', async () => {
    const gate = deferred<TestGrant>();
    const { auth } = await createSignedIn({ strategy: { renew: vi.fn(() => gate.promise) } });
    const backend = createBackend();
    const controller = new AbortController();
    const request = createAuthFetch(auth, { fetch: backend.fetch })(URL_OK, {
      signal: controller.signal,
    });
    await flush();
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    gate.resolve(makeGrant('x'));
  });

  it('родной fetch вызывается без чужого this', async () => {
    let receivedThis: unknown = 'not-called';
    const backend = createBackend();
    const fetch = function (this: unknown, input: RequestInfo | URL) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- проверяем значение this
      receivedThis = this;
      return backend.fetch(input);
    } as typeof globalThis.fetch;
    const { auth } = await createSignedIn();
    await createAuthFetch(auth, { fetch })(URL_OK, { skipAuth: true });
    expect(receivedThis).toBeUndefined();
  });

  it('готовый auth.fetch работает с глобальным fetch', async () => {
    const backend = createBackend('first-token');
    vi.stubGlobal('fetch', backend.fetch);
    const { auth } = await createSignedIn();
    const { fetch } = auth;
    await expect(fetch(URL_OK)).resolves.toMatchObject({ status: 200 });
    vi.unstubAllGlobals();
  });

  it('GraphQL: 200 с UNAUTHENTICATED запускает обновление токена', async () => {
    const graphqlResponse = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        graphqlResponse({ errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] }),
      )
      .mockResolvedValue(graphqlResponse({ data: { me: { id: 1 } } }));
    const { auth, strategy } = await createSignedIn();
    const authFetch = createAuthFetch(auth, { fetch, effectiveStatus: graphqlEffectiveStatus });

    const response = await authFetch(URL_OK, { method: 'POST', body: '{"query":"{me{id}}"}' });

    expect(strategy.renew).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({ data: { me: { id: 1 } } });
  });
});

describe('graphqlEffectiveStatus', () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it.each([
    ['ошибка авторизации', json({ errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] }), 401],
    ['другая ошибка', json({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }), 200],
    ['без ошибок', json({ data: {} }), 200],
    ['статус не 200 не трогается', json({}, 500), 500],
    ['не JSON', new Response('<html>'), 200],
    [
      'битый JSON',
      new Response('{oops', { headers: { 'Content-Type': 'application/json' } }),
      200,
    ],
    ['ошибка без extensions', json({ errors: [{ message: 'x' }] }), 200],
  ])('%s', async (_, response, expected) => {
    await expect(graphqlEffectiveStatus(response)).resolves.toBe(expected);
  });

  it('тело ответа остаётся доступно приложению', async () => {
    const response = json({ data: { a: 1 } });
    await graphqlEffectiveStatus(response);
    await expect(response.json()).resolves.toEqual({ data: { a: 1 } });
  });
});

/** Модель axios: цепочка перехватчиков, reject на статус, merge конфига без символов. */
function createFakeAxios(
  respond: (config: Record<string, unknown>) => { status: number },
  { rejectOnError = true }: { rejectOnError?: boolean } = {},
) {
  type Handler = {
    fulfilled: (value: unknown) => unknown;
    rejected?: (error: unknown) => unknown;
  };
  const requestHandlers = new Map<number, Handler>();
  const responseHandlers = new Map<number, Handler>();
  let nextId = 0;
  const sent: Record<string, unknown>[] = [];

  const makeInterceptors = (handlers: Map<number, Handler>) => ({
    use: (fulfilled: (value: never) => unknown, rejected?: (error: never) => unknown) => {
      nextId += 1;
      handlers.set(nextId, {
        fulfilled: fulfilled as Handler['fulfilled'],
        rejected: rejected as Handler['rejected'],
      });
      return nextId;
    },
    eject: (id: number) => void handlers.delete(id),
  });

  const instance = {
    interceptors: {
      request: makeInterceptors(requestHandlers),
      response: makeInterceptors(responseHandlers),
    },
    sent,
    async request(rawConfig: Record<string, unknown>): Promise<unknown> {
      // Как mergeConfig: только перечисляемые строковые ключи.
      const merged: Record<string, unknown> = {};
      for (const key of Object.keys(rawConfig)) merged[key] = rawConfig[key];
      let chain: Promise<unknown> = Promise.resolve(merged);
      for (const handler of requestHandlers.values()) {
        chain = chain.then(handler.fulfilled, handler.rejected);
      }
      chain = chain.then((config) => {
        const typed = config as Record<string, unknown>;
        sent.push({ ...typed, headers: { ...(typed.headers as object) } });
        const response = { ...respond(typed), config: typed, headers: {}, data: {} };
        if (rejectOnError && response.status >= 400) {
          throw Object.assign(new Error(`status ${response.status}`), { response, config: typed });
        }
        return response;
      });
      for (const handler of responseHandlers.values()) {
        chain = chain.then(handler.fulfilled, handler.rejected);
      }
      return chain;
    },
  };
  return instance;
}

describe('attachAuthToAxios', () => {
  const respondByToken =
    (...tokens: string[]) =>
    (config: Record<string, unknown>) => {
      const header = (config.headers as Record<string, string> | undefined)?.Authorization;
      return { status: tokens.some((token) => header === `Bearer ${token}`) ? 200 : 401 };
    };

  const config = (extra: object = {}) => ({ url: URL_OK, method: 'get', headers: {}, ...extra });

  it('подписывает запрос', async () => {
    const { auth } = await createSignedIn();
    const axios = createFakeAxios(respondByToken('first-token'));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await axios.request(config());
    expect(axios.sent[0]?.headers).toMatchObject({ Authorization: 'Bearer first-token' });
  });

  it('использует AxiosHeaders.set, если он есть', async () => {
    const { auth } = await createSignedIn();
    const axios = createFakeAxios(() => ({ status: 200 }));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    const set = vi.fn();
    await axios.request(config({ headers: { set } }));
    expect(set).toHaveBeenCalledWith('Authorization', 'Bearer first-token');
  });

  it('401: обновляет токен и повторяет', async () => {
    const { auth, strategy } = await createSignedIn();
    const axios = createFakeAxios(respondByToken('renewed-token'));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await expect(axios.request(config())).resolves.toMatchObject({ status: 200 });
    expect(strategy.renew).toHaveBeenCalledTimes(1);
    expect(axios.sent).toHaveLength(2);
  });

  it('новый токен тоже отвергнут: запросов два, исключение наружу, без цикла', async () => {
    const { auth } = await createSignedIn();
    const axios = createFakeAxios(() => ({ status: 401 }));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await expect(axios.request(config())).rejects.toThrow('status 401');
    expect(axios.sent).toHaveLength(2);
  });

  it('validateStatus пропустил 401: повтор работает и через успешную ветку', async () => {
    const { auth, strategy } = await createSignedIn();
    const axios = createFakeAxios(respondByToken('renewed-token'), { rejectOnError: false });
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await expect(axios.request(config())).resolves.toMatchObject({ status: 200 });
    expect(strategy.renew).toHaveBeenCalledTimes(1);
    expect(axios.sent).toHaveLength(2);
  });

  it('чужой origin: без токена', async () => {
    const { auth } = await createSignedIn();
    const axios = createFakeAxios(() => ({ status: 200 }));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await axios.request(config({ url: 'https://cdn.other.test/x' }));
    expect(axios.sent[0]?.headers).toEqual({});
  });

  it('использует getUri для учёта baseURL', async () => {
    const { auth } = await createSignedIn();
    const axios = Object.assign(createFakeAxios(() => ({ status: 200 })), {
      getUri: (requestConfig: { url?: string }) => `https://other.test${requestConfig.url}`,
    });
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await axios.request(config({ url: '/relative' }));
    expect(axios.sent[0]?.headers).toEqual({});
  });

  it('режим include превращается в withCredentials', async () => {
    const { auth } = await createSignedIn({
      strategy: { decorate: () => ({ credentialsMode: 'include' }) },
    });
    const axios = createFakeAxios(() => ({ status: 200 }));
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await axios.request(config());
    expect(axios.sent[0]?.withCredentials).toBe(true);
  });

  it('ошибка сети проходит насквозь без refresh', async () => {
    const { auth, strategy } = await createSignedIn();
    const axios = createFakeAxios(() => {
      throw new Error('Network Error');
    });
    attachAuthToAxios(auth, axios as unknown as AxiosLike);
    await expect(axios.request(config())).rejects.toThrow('Network Error');
    expect(strategy.renew).not.toHaveBeenCalled();
  });

  it('отключение снимает перехватчики', async () => {
    const { auth } = await createSignedIn();
    const axios = createFakeAxios(() => ({ status: 200 }));
    const detach = attachAuthToAxios(auth, axios as unknown as AxiosLike);
    detach();
    await axios.request(config());
    expect(axios.sent[0]?.headers).toEqual({});
  });
});

describe('кэши запросов', () => {
  it('TanStack: кэш сбрасывается при выходе и смене пользователя, но не при входе', async () => {
    const { auth } = await createSignedIn({
      strategy: { login: vi.fn(async () => makeGrant('boris', makeUser('boris'))) },
    });
    const client = { clear: vi.fn() };
    bindAuthToQueryClient(auth, client);

    auth.patchUser({ name: 'x' });
    expect(client.clear).not.toHaveBeenCalled();

    await auth.login({});
    expect(client.clear).toHaveBeenCalledTimes(1);

    await auth.logout();
    expect(client.clear).toHaveBeenCalledTimes(2);
  });

  it('TanStack: вход гостя и ready не сбрасывают кэш', async () => {
    const { auth } = createAuth();
    const client = { clear: vi.fn() };
    bindAuthToQueryClient(auth, client);
    await auth.bootstrap();
    await auth.login({});
    expect(client.clear).not.toHaveBeenCalled();
  });

  it('RTK Query: состояние сбрасывается на границе сессии', async () => {
    const { auth } = await createSignedIn();
    const action = { type: 'api/resetApiState' };
    const api = { util: { resetApiState: vi.fn(() => action) } };
    const store = { dispatch: vi.fn() };
    const unbind = bindAuthToRtkQuery(auth, store, api);

    auth.kick();
    expect(store.dispatch).toHaveBeenCalledWith(action);
    unbind();
  });

  it.each([
    ['сессия сменилась', new AuthError('session_changed'), 0, false],
    ['401', AuthError.fromStatus(401), 0, false],
    ['сеть', new AuthError('network'), 0, true],
    ['сеть, лимит исчерпан', new AuthError('network'), 3, false],
    ['обычная ошибка', new Error('x'), 1, true],
  ])('shouldRetryQuery: %s', (_, error, failureCount, expected) => {
    expect(shouldRetryQuery(failureCount, error)).toBe(expected);
  });
});
