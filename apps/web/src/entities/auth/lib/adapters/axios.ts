import { describeResponse } from '../response-info';
import type { AuthPipeline, AuthTicket, Unsubscribe } from '../types';

// Ключи строковые намеренно: axios.mergeConfig при повторе отбрасывает символы,
// и запрос ушёл бы в бесконечный повтор.
const TICKET_KEY = '__authTicket';
const RETRY_OF_KEY = '__authRetryOf';
const NOT_RETRIED = Symbol('not-retried');

type AxiosConfig = Record<string, unknown> & {
  url?: string;
  baseURL?: string;
  method?: string;
  headers?: unknown;
  signal?: unknown;
  withCredentials?: boolean;
  skipAuth?: boolean;
};

interface AxiosInterceptors {
  // Параметры never: под такую сигнатуру подходит тип настоящего axios любой версии.
  use: (...handlers: never[]) => number;
  eject(id: number): void;
}

/** Структурный тип: сам axios в зависимостях не нужен. */
export interface AxiosLike {
  readonly interceptors: {
    readonly request: AxiosInterceptors;
    readonly response: AxiosInterceptors;
  };
  request(config: never): Promise<unknown>;
  getUri?(config?: never): string;
}

interface AxiosResponseLike {
  status: number;
  headers?: unknown;
  data?: unknown;
  config?: AxiosConfig;
}

function setHeader(config: AxiosConfig, name: string, value: string): void {
  const headers = config.headers as
    { set?: (name: string, value: string) => void } | undefined;
  if (typeof headers?.set === 'function') headers.set(name, value);
  else config.headers = { ...headers, [name]: value };
}

function resolveTarget(instance: AxiosLike, config: AxiosConfig): string {
  if (instance.getUri) return instance.getUri(config as never);
  return new URL(config.url ?? '', config.baseURL || undefined).href;
}

/** Подключает авторизацию к экземпляру axios. Возвращает функцию отключения. */
export function attachAuthToAxios(
  auth: AuthPipeline,
  instance: AxiosLike,
): Unsubscribe {
  const signalOf = (config: AxiosConfig) =>
    config.signal as AbortSignal | undefined;

  const onRequest = async (config: AxiosConfig) => {
    const attempt = await auth.prepare(
      {
        url: auth.resolveUrl(resolveTarget(instance, config)),
        method: config.method ?? 'GET',
      },
      {
        signal: signalOf(config),
        skip: config.skipAuth === true,
        retryOf: config[RETRY_OF_KEY] as AuthTicket | undefined,
      },
    );
    for (const [name, value] of Object.entries(attempt.headers))
      setHeader(config, name, value);
    if (attempt.credentialsMode)
      config.withCredentials = attempt.credentialsMode === 'include';
    config[TICKET_KEY] = attempt.ticket;
    return config;
  };

  const reconcile = async (
    config: AxiosConfig | undefined,
    response: AxiosResponseLike,
  ) => {
    const ticket = config?.[TICKET_KEY] as AuthTicket | undefined;
    const info = describeResponse(response);
    if (!config || !ticket || !info) return NOT_RETRIED;
    const verdict = await auth.settle({ ticket }, info, {
      signal: signalOf(config),
    });
    if (verdict !== 'retry') return NOT_RETRIED;
    return instance.request({ ...config, [RETRY_OF_KEY]: ticket } as never);
  };

  const onResponse = async (response: AxiosResponseLike) => {
    const retried = await reconcile(response.config, response);
    return retried === NOT_RETRIED ? response : retried;
  };

  const onResponseError = async (error: {
    response?: AxiosResponseLike;
    config?: AxiosConfig;
  }) => {
    if (!error.response) throw error;
    const retried = await reconcile(
      error.config ?? error.response.config,
      error.response,
    );
    if (retried === NOT_RETRIED) throw error;
    return retried;
  };

  const requestId = instance.interceptors.request.use(onRequest as never);
  const responseId = instance.interceptors.response.use(
    onResponse as never,
    onResponseError as never,
  );

  return () => {
    instance.interceptors.request.eject(requestId);
    instance.interceptors.response.eject(responseId);
  };
}
