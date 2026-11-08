import { createHash, timingSafeEqual } from 'node:crypto';

/** Часы устройства могут расходиться с сервером, но старая подпись работать не должна. */
export const SALT_TIMESTAMP_WINDOW_MS = 5 * 60_000;

const VERSION_PATTERN = /^[\w.+-]{1,64}$/;
const TIMESTAMP_PATTERN = /^\d{1,16}$/;

const sha256Hex = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** Соль сборки клиента. Секрет живёт только на сервере и в сборочном скрипте. */
export const createSalt = (version: string, secret: string) => sha256Hex(secret + version);

export const createSaltToken = (salt: string, identifier: string, timestamp: string) =>
  sha256Hex(salt + identifier + timestamp);

function sameToken(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidSaltSignature(input: {
  version: string;
  token: string;
  timestamp: string;
  identifier: string;
  secret: string;
  now: Date;
}): boolean {
  const { version, token, timestamp, identifier, secret, now } = input;
  if (!VERSION_PATTERN.test(version) || !TIMESTAMP_PATTERN.test(timestamp)) return false;
  if (Math.abs(now.getTime() - Number(timestamp)) > SALT_TIMESTAMP_WINDOW_MS) return false;
  return sameToken(createSaltToken(createSalt(version, secret), identifier, timestamp), token);
}
