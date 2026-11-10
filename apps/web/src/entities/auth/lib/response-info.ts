import type { AuthResponseInfo } from './types';

interface ResponseShape {
  status?: unknown;
  headers?: unknown;
  data?: unknown;
  clone?: () => { json(): Promise<unknown> };
}

function readHeader(headers: unknown, name: string): string | null {
  if (typeof headers !== 'object' || headers === null) return null;
  const { get } = headers as { get?: unknown };
  if (typeof get === 'function') {
    const value: unknown = get.call(headers, name);
    return typeof value === 'string' ? value : null;
  }
  const value = (headers as Record<string, unknown>)[name.toLowerCase()];
  return typeof value === 'string' ? value : null;
}

/** Описание ответа любой формы: `Response`, ответ axios или `{ status }`. */
export function describeResponse(value: unknown): AuthResponseInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const response = value as ResponseShape;
  const { status } = response;
  if (typeof status !== 'number') return null;
  return {
    status,
    header: (name) => readHeader(response.headers, name),
    json: async () => (response.clone ? response.clone().json() : response.data),
  };
}

/** То же для клиентов, которые бросают исключение на статус ошибки. */
export function describeThrown(error: unknown): AuthResponseInfo | null {
  if (typeof error !== 'object' || error === null) return null;
  return describeResponse((error as { response?: unknown }).response) ?? describeResponse(error);
}
