import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 2 ** 16;
const R = 8;
const P = 2;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, { N: n, r, p, maxmem: MAX_MEMORY }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

const format = (salt: Buffer, key: Buffer) =>
  `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  return format(salt, await derive(password, salt, N, R, P));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Хэш из нулей: проверка идёт с теми же затратами, а совпасть ни с чем не может. */
export const DUMMY_PASSWORD_HASH = format(Buffer.alloc(SALT_BYTES), Buffer.alloc(KEY_BYTES));
