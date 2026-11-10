import {
  apiErrorSchema,
  authResponseSchema,
  meSchema,
  type LoginBody,
  type Me,
  type RegisterBody,
} from '@gwmt/contracts';
import {
  AuthError,
  type AuthErrorBodyReader,
  type BearerApi,
  type BearerTokens,
  type FetchUserContext,
} from '../lib';
import { createLoginSignature } from './login-signature';

const API_ROOT = '/api/v1';

export type CredentialsInput =
  | (LoginBody & { readonly kind: 'password' })
  | (RegisterBody & { readonly kind: 'register' });

const readApiError: AuthErrorBodyReader = (body) => {
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) return null;
  const { code, message, fields } = parsed.data.error;
  return { serverCode: code, message, details: fields };
};

async function throwIfFailed(response: Response): Promise<Response> {
  if (!response.ok) throw await AuthError.fromResponse(response, readApiError);
  return response;
}

// Запросы авторизации идут обычным fetch: через авторизованный refresh ждал бы сам себя.
function post(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_ROOT}${path}`, { method: 'POST', ...init }).then(throwIfFailed);
}

// Срок берётся из JWT, а не из accessTokenExpiresAt: дата зависит от часов клиента.
async function readTokens(response: Response): Promise<BearerTokens<Me>> {
  const parsed = authResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AuthError('bad_response');
  return { accessToken: parsed.data.accessToken, user: parsed.data.user };
}

export const authApi = {
  login: async (input, { signal }) => {
    const { kind, ...body } = input;
    const response = await post(kind === 'register' ? '/auth/register' : '/auth/login', {
      signal,
      headers: { 'Content-Type': 'application/json', ...(await createLoginSignature(body.email)) },
      body: JSON.stringify(body),
    });
    return readTokens(response);
  },
  refresh: async ({ signal }) => readTokens(await post('/auth/refresh', { signal })),
  logout: async ({ signal }) => {
    // keepalive: приложение обычно сразу уводит пользователя на другую страницу.
    await post('/auth/logout', { signal, keepalive: true });
  },
} satisfies BearerApi<Me, CredentialsInput>;

export async function fetchMe({ fetch: authFetch, signal }: FetchUserContext): Promise<Me> {
  const response = await authFetch(`${API_ROOT}/me`, { signal }).then(throwIfFailed);
  const parsed = meSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AuthError('bad_response');
  return parsed.data;
}
