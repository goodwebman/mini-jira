export type AuthErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'bad_request'
  | 'server'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'bad_response'
  | 'session_changed'
  | 'misconfigured'
  | 'destroyed'
  | 'unknown';

const RETRYABLE_CODES: ReadonlySet<AuthErrorCode> = new Set([
  'network',
  'timeout',
  'rate_limited',
  'server',
]);

const DEFAULT_MESSAGES: Record<AuthErrorCode, string> = {
  unauthorized: 'Нужно войти в систему',
  forbidden: 'Доступ запрещён',
  rate_limited: 'Слишком много запросов',
  bad_request: 'Сервер отклонил запрос',
  server: 'Ошибка сервера',
  network: 'Нет соединения с сервером',
  timeout: 'Сервер не ответил вовремя',
  aborted: 'Запрос отменён',
  bad_response: 'Сервер вернул некорректный ответ',
  session_changed: 'Сессия сменилась, пока выполнялся запрос',
  misconfigured: 'Сервис авторизации настроен неверно',
  destroyed: 'Сервис авторизации остановлен',
  unknown: 'Неизвестная ошибка авторизации',
};

export interface AuthErrorOptions {
  readonly message?: string;
  readonly status?: number;
  /** Машинный код ошибки из ответа сервера, например `REFRESH_REUSED`. */
  readonly serverCode?: string;
  readonly retryAfterMs?: number;
  readonly details?: unknown;
  readonly cause?: unknown;
}

export type AuthErrorBodyReader = (
  body: unknown,
) => Pick<AuthErrorOptions, 'message' | 'serverCode' | 'details'> | null | undefined;

interface ResponseWithBody {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  clone(): { json(): Promise<unknown> };
}

// Ошибки HTTP-клиентов держат config.headers с токеном: положить их в cause значит отправить токен в логи.
function safeCause(cause: unknown): unknown {
  if (!(cause instanceof Error)) return undefined;
  return 'config' in cause || 'request' in cause || 'response' in cause ? undefined : cause;
}

function codeForStatus(status: number): AuthErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'bad_request';
  return 'bad_response';
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

/** Единственный тип ошибки, который сервис отдаёт наружу. Секретов не содержит. */
export class AuthError extends Error {
  override readonly name = 'AuthError';
  readonly code: AuthErrorCode;
  readonly status: number | undefined;
  readonly serverCode: string | undefined;
  readonly retryAfterMs: number | undefined;
  readonly details: unknown;

  constructor(code: AuthErrorCode, options: AuthErrorOptions = {}) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: safeCause(options.cause) });
    this.code = code;
    this.status = options.status;
    this.serverCode = options.serverCode;
    this.retryAfterMs = options.retryAfterMs;
    this.details = options.details;
  }

  /** Повтор имеет смысл: сессия жива, подвела сеть или сервер. */
  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code);
  }

  static fromStatus(status: number, options: AuthErrorOptions = {}): AuthError {
    return new AuthError(codeForStatus(status), { ...options, status });
  }

  /** Читает статус, `Retry-After` и, если передан `read`, код ошибки из тела. */
  static async fromResponse(
    response: ResponseWithBody,
    read?: AuthErrorBodyReader,
  ): Promise<AuthError> {
    let parsed: ReturnType<AuthErrorBodyReader> = null;
    if (read) {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      parsed = read(body);
    }
    return AuthError.fromStatus(response.status, {
      ...parsed,
      retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
    });
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      serverCode: this.serverCode,
      retryable: this.retryable,
    };
  }
}

export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;

function readStatus(error: object): number | undefined {
  const source = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown } | null;
  };
  const value = source.status ?? source.statusCode ?? source.response?.status;
  return typeof value === 'number' && value >= 100 && value < 600 ? value : undefined;
}

/** Приводит что угодно к `AuthError`. Статус ищет по форме объекта: fetch, axios, свой клиент. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (typeof error === 'object' && error !== null) {
    const { name } = error as { name?: unknown };
    if (name === 'AbortError') return new AuthError('aborted', { cause: error });
    if (name === 'TimeoutError') return new AuthError('timeout', { cause: error });
    const status = readStatus(error);
    if (status !== undefined) return AuthError.fromStatus(status, { cause: error });
  }
  return new AuthError(error instanceof TypeError ? 'network' : 'unknown', { cause: error });
}
