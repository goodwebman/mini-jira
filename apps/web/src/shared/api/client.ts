import { http } from './http';
import { getApiUrl } from './requireApiUrl';

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(response: Response, body: unknown) {
    super(`API ${response.status} ${response.statusText}`);
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.body = body;
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & { skipAuth?: boolean };

async function request<T>(
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<T> {
  const { skipAuth, headers, ...init } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData)
    finalHeaders.set('Content-Type', 'application/json');

  const response = await (skipAuth ? fetch : http)(getApiUrl(path), {
    ...init,
    headers: finalHeaders,
    body: body === undefined || isFormData ? body : JSON.stringify(body),
  });
  const payload: unknown =
    response.status === 204
      ? undefined
      : response.headers.get('content-type')?.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text();

  if (!response.ok) throw new ApiError(response, payload);
  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, undefined, { ...options, method: 'GET' }),
  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, undefined, { ...options, method: 'DELETE' }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => request<T>(path, body, { ...options, method: 'POST' }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => request<T>(path, body, { ...options, method: 'PUT' }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => request<T>(path, body, { ...options, method: 'PATCH' }),
};
