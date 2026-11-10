import { AuthError } from '../lib';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Подпись входа и регистрации: `fastify-token = SHA256(salt + email + timestamp)`.
 * Это защита от простых скриптов, а не секрет: соль лежит в бандле. `email` передаётся
 * ровно таким, как в теле запроса.
 */
export async function createLoginSignature(email: string): Promise<Record<string, string>> {
  const salt = import.meta.env.VITE_AUTH_SALT as string | undefined;
  const version = import.meta.env.VITE_APP_VERSION as string | undefined;
  if (!salt || !version) {
    throw new AuthError('misconfigured', {
      message: 'Не заданы VITE_AUTH_SALT и VITE_APP_VERSION: смотри apps/web/.env.example',
    });
  }
  const timestamp = String(Date.now());
  return {
    'fastify-version': version,
    'fastify-timestamp': timestamp,
    'fastify-token': await sha256Hex(`${salt}${email}${timestamp}`),
  };
}
