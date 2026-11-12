import type { AuthAttempt, AuthPipeline, AuthResponseInfo } from '../types';

export interface AuthRequestInit extends RequestInit {
  /** Отправить запрос без подписи. */
  readonly skipAuth?: boolean;
}

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: AuthRequestInit,
) => Promise<Response>;

export interface CreateAuthFetchOptions {
  /** Базовый fetch. Не должен быть авторизованным. */
  readonly fetch?: typeof globalThis.fetch;
  /** Статус для конвейера, если он не совпадает с HTTP: например, GraphQL отвечает 200 на всё. */
  readonly effectiveStatus?: (response: Response) => number | Promise<number>;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof input === 'object' && 'url' in input && 'method' in input;
}

function decorate(request: Request, attempt: AuthAttempt): Request {
  const headers = new Headers(request.headers);
  for (const [name, value] of Object.entries(attempt.headers))
    headers.set(name, value);
  return new Request(request, {
    headers,
    // Custom API-key/CSRF headers must never follow a redirect to another origin.
    redirect: 'error',
    ...(attempt.credentialsMode
      ? { credentials: attempt.credentialsMode }
      : {}),
  });
}

function describe(response: Response, status: number): AuthResponseInfo {
  return {
    status,
    header: (name) => response.headers.get(name),
    json: () => response.clone().json() as Promise<unknown>,
  };
}

/**
 * Заворачивает fetch в конвейер авторизации, контракт `fetch` не меняется: на 401 после
 * закрытия сессии возвращается сам ответ, исключение только когда ответа нет.
 *
 * Этого хватает для всего, что принимает свой fetch: ky, ofetch, openapi-fetch,
 * RTK Query (`fetchFn`), Apollo, urql, graphql-request.
 */
export function createAuthFetch(
  auth: AuthPipeline,
  options: CreateAuthFetchOptions = {},
): AuthFetch {
  // Вызов не как метод объекта: родной fetch падает с Illegal invocation при чужом this.
  const send = (request: Request) =>
    (options.fetch ?? globalThis.fetch)(request);

  return async (input, init) => {
    const { skipAuth, ...requestInit } = init ?? {};
    const source = new Request(
      isRequest(input) ? input : auth.resolveUrl(String(input)),
      requestInit,
    );

    return auth.execute(
      { url: source.url, method: source.method },
      // Тело читается один раз, поэтому у подписанного запроса всегда отправляется копия:
      // оригинал нужен для повтора.
      (attempt) =>
        send(
          attempt.ticket.authorized
            ? decorate(source.clone(), attempt)
            : source,
        ),
      {
        signal: source.signal,
        skip: skipAuth,
        inspect: async (response) =>
          describe(
            response,
            (await options.effectiveStatus?.(response)) ?? response.status,
          ),
        // Не прочитанное тело держит соединение.
        discard: (response) => void response.body?.cancel().catch(() => {}),
      },
    );
  };
}
