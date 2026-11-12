import { AuthError } from './errors';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const RETURN_TO_PROBE = 'https://return-to.invalid';

export interface OriginPolicyOptions {
  readonly trustedOrigins?: readonly string[];
  readonly redirectOrigins?: readonly string[];
  readonly allowInsecureOrigins?: boolean;
  readonly baseUrl?: string;
  readonly selfOrigin: () => null | string;
}

function normalizeOrigin(entry: string, allowInsecure: boolean): string {
  const invalid = (reason: string) =>
    new AuthError('misconfigured', {
      message: `Недопустимый origin "${entry}": ${reason}`,
    });

  if (entry.includes('*'))
    throw invalid('маски запрещены, перечислите origin явно');
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    throw invalid('это не URL');
  }
  if (url.origin !== entry)
    throw invalid('нужен только origin, без пути и слэша на конце');
  if (
    url.protocol === 'http:' &&
    !allowInsecure &&
    !LOOPBACK_HOSTS.has(url.hostname)
  ) {
    throw invalid('токены нельзя отправлять по http');
  }
  return url.origin;
}

/**
 * Решает, можно ли подписать запрос. Токен уходит только на свой origin и явно
 * перечисленные. Случайный `authFetch('https://cdn...')` не должен его отдать.
 */
export class OriginPolicy {
  readonly #trusted: ReadonlySet<string>;
  readonly #redirects: ReadonlySet<string>;
  readonly #baseUrl: string | undefined;
  readonly #selfOrigin: () => null | string;

  constructor(options: OriginPolicyOptions) {
    const allowInsecure = options.allowInsecureOrigins ?? false;
    const parse = (entries: readonly string[] | undefined) =>
      new Set(
        (entries ?? []).map((entry) => normalizeOrigin(entry, allowInsecure)),
      );
    this.#trusted = parse(options.trustedOrigins);
    this.#redirects = parse(options.redirectOrigins);
    if (options.baseUrl !== undefined && !URL.canParse(options.baseUrl)) {
      throw new AuthError('misconfigured', {
        message: `Недопустимый baseUrl "${options.baseUrl}"`,
      });
    }
    this.#baseUrl = options.baseUrl;
    this.#selfOrigin = options.selfOrigin;
  }

  #parse(url: string): null | URL {
    try {
      return new URL(url, this.#baseUrl ?? this.#selfOrigin() ?? undefined);
    } catch {
      return null;
    }
  }

  #isOwn(origin: string): boolean {
    const base = this.#baseUrl ?? this.#selfOrigin();
    if (base === null) return false;
    return new URL(base).origin === origin;
  }

  resolve(url: string): string {
    return this.#parse(url)?.href ?? url;
  }

  isTrusted(url: string): boolean {
    const origin = this.#parse(url)?.origin;
    return (
      origin !== undefined && (this.#trusted.has(origin) || this.#isOwn(origin))
    );
  }

  isAllowedRedirect(url: string): boolean {
    const origin = this.#parse(url)?.origin;
    return (
      origin !== undefined &&
      (this.#redirects.has(origin) || this.isTrusted(url))
    );
  }
}

/**
 * Защита от open redirect: пропускает только путь внутри приложения. Строка разбирается
 * тем же алгоритмом, что и в браузере: `//evil.com`, `/\evil.com` и `/\t/evil.com` уводят
 * на чужой origin, поэтому отсеиваются. Символы вручную не перебираем, чтобы не разойтись с ним.
 */
export function sanitizeReturnTo(
  value: null | string | undefined,
  fallback = '/',
): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  try {
    const parsed = new URL(value, RETURN_TO_PROBE);
    if (parsed.origin === RETURN_TO_PROBE)
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Строка вида `//[` не разбирается вовсе.
  }
  return fallback;
}
