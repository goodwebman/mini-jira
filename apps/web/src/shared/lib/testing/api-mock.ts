type Method = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface MockCall {
  readonly method: Method;
  /** Путь без префикса API: `/boards/9`. */
  readonly path: string;
  readonly search: URLSearchParams;
  readonly body: unknown;
}

type Resolver = (call: MockCall) => unknown;

interface Handler {
  readonly method: Method;
  readonly path: RegExp | string;
  readonly reply: unknown;
  readonly status: number;
  readonly once: boolean;
  used: boolean;
}

export interface ApiMock {
  /** Подставляется в `configureApiTransport`. */
  readonly fetch: typeof fetch;
  readonly calls: MockCall[];
  /** Запросы без обработчика: тест сразу видит, что забыл замокать. */
  readonly unmatched: MockCall[];
  /**
   * Ответ на запрос. Позже добавленный обработчик главнее: тест переопределяет
   * общий сценарий. `reply` — тело, `Response` или функция от запроса.
   */
  on: (
    method: Method,
    path: RegExp | string,
    reply?: Resolver | unknown,
    options?: { status?: number; once?: boolean },
  ) => ApiMock;
  callsTo: (method: Method, path: RegExp | string) => MockCall[];
}

const API_PREFIX = /^\/api\/v1(?=\/)/;

function matches(pattern: RegExp | string, call: MockCall): boolean {
  if (typeof pattern === 'string') return pattern === call.path;
  const query = call.search.toString();
  return pattern.test(query ? `${call.path}?${query}` : call.path);
}

function toBody(raw: BodyInit | null | undefined): unknown {
  if (typeof raw !== 'string') return raw ?? undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function toResponse(handler: Handler, call: MockCall): Promise<Response> {
  const value =
    typeof handler.reply === 'function'
      ? await (handler.reply as Resolver)(call)
      : handler.reply;
  if (value instanceof Response) return value;
  if (handler.status === 204 || value === undefined)
    return new Response(null, {
      status: handler.status === 200 ? 204 : handler.status,
    });
  return Response.json(value, { status: handler.status });
}

/** Фейковый HTTP-транспорт: проверяет и URL, и тело запроса, как настоящий сервер. */
export function createApiMock(): ApiMock {
  const handlers: Handler[] = [];
  const calls: MockCall[] = [];
  const unmatched: MockCall[] = [];

  const api: ApiMock = {
    calls,
    unmatched,
    fetch: async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        'http://localhost',
      );
      const call: MockCall = {
        method: (init?.method ?? 'GET').toUpperCase() as Method,
        path: url.pathname.replace(API_PREFIX, ''),
        search: url.searchParams,
        body: toBody(init?.body),
      };
      calls.push(call);
      const handler = handlers.findLast(
        (item) =>
          item.method === call.method &&
          matches(item.path, call) &&
          !(item.once && item.used),
      );
      if (!handler) {
        unmatched.push(call);
        return Response.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: `Нет мока для ${call.method} ${call.path}`,
              requestId: 'test',
            },
          },
          { status: 501 },
        );
      }
      handler.used = true;
      return toResponse(handler, call);
    },
    on: (method, path, reply, options = {}) => {
      handlers.push({
        method,
        path,
        reply,
        status: options.status ?? 200,
        once: options.once ?? false,
        used: false,
      });
      return api;
    },
    callsTo: (method, path) =>
      calls.filter((call) => call.method === method && matches(path, call)),
  };
  return api;
}

/** Тело ошибки в формате API. */
export function apiError(
  code: string,
  message = 'Ошибка',
  fields?: Record<string, string>,
) {
  return {
    error: { code, message, requestId: 'test', ...(fields ? { fields } : {}) },
  };
}
