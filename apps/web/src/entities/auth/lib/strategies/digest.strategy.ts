import { AuthError } from '../errors';
import type {
  AuthDecoration,
  AuthGrant,
  AuthResponseInfo,
  AuthStrategy,
  AuthTarget,
  AuthVerdict,
  MaybePromise,
  StrategyContext,
} from '../types';

type Hasher = (text: string) => MaybePromise<string>;

interface DigestChallenge {
  readonly realm: string;
  readonly nonce: string;
  readonly opaque: string | undefined;
  readonly algorithm: string;
  readonly isSession: boolean;
  readonly isStale: boolean;
}

/** Состояние сессии. Счётчик и nonce меняются от запроса к запросу. */
export interface DigestCredentials {
  readonly username: string;
  readonly realm: string;
  /** `H(username:realm:password)`. Пароль после входа не хранится. */
  readonly secret: string;
  readonly algorithm: string;
  readonly isSession: boolean;
  nonce: string;
  opaque: string | undefined;
  counter: number;
}

export interface DigestLoginInput {
  readonly username: string;
  readonly password: string;
}

export interface DigestStrategyOptions<TUser> {
  /** Защищённый адрес, на котором проверяется вход. */
  readonly verifyUrl: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly parseUser?: (response: Response) => Promise<TUser>;
  /**
   * Дополнительные алгоритмы, например `{ MD5: md5 }` для старых серверов. По умолчанию
   * только SHA-256: MD5 нет в Web Crypto, и молча откатываться на него нельзя.
   */
  readonly hashers?: Readonly<Record<string, Hasher>>;
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const sha256: Hasher = async (text) =>
  toHex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
    ),
  );

function randomHex(byteLength: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

const isAscii = (value: string) =>
  Array.from(value).every((char) => char.charCodeAt(0) < 0x80);

const quote = (value: string) => `"${value.replace(/(["\\])/g, '\\$1')}"`;

/** Разбирает `WWW-Authenticate`: в нём может быть несколько схем и кавычки с запятыми. */
function parseChallenges(
  header: string,
): { scheme: string; params: Map<string, string> }[] {
  const challenges: { scheme: string; params: Map<string, string> }[] = [];
  let index = 0;

  const skipSeparators = () => {
    while (index < header.length && /[\s,]/.test(header.charAt(index)))
      index += 1;
  };
  const readToken = () => {
    const start = index;
    while (index < header.length && !/[\s,=]/.test(header.charAt(index)))
      index += 1;
    return header.slice(start, index);
  };
  const readValue = () => {
    if (header.charAt(index) !== '"') return readToken();
    index += 1;
    let value = '';
    while (index < header.length && header.charAt(index) !== '"') {
      if (header.charAt(index) === '\\') index += 1;
      value += header.charAt(index);
      index += 1;
    }
    index += 1;
    return value;
  };

  while (index < header.length) {
    skipSeparators();
    const token = readToken();
    if (token === '') {
      index += 1;
      continue;
    }
    if (header.charAt(index) === '=') {
      index += 1;
      challenges.at(-1)?.params.set(token.toLowerCase(), readValue());
    } else {
      challenges.push({ scheme: token.toLowerCase(), params: new Map() });
    }
  }
  return challenges;
}

/** RFC 7616 в браузере. Сервер обязан отдавать `WWW-Authenticate` и через CORS. */
export class DigestStrategy<TUser> implements AuthStrategy<
  DigestCredentials,
  TUser,
  DigestLoginInput
> {
  readonly name = 'digest';
  readonly #options: DigestStrategyOptions<TUser>;
  readonly #hashers: ReadonlyMap<string, Hasher>;

  constructor(options: DigestStrategyOptions<TUser>) {
    this.#options = options;
    this.#hashers = new Map(
      Object.entries({ 'SHA-256': sha256, ...options.hashers }).map(
        ([name, hasher]) => [name.toUpperCase(), hasher],
      ),
    );
  }

  async restore(): Promise<AuthGrant<DigestCredentials, TUser> | null> {
    return null;
  }

  async login(
    { username, password }: DigestLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<DigestCredentials, TUser>> {
    const probe = await this.#send({}, context.signal);
    if (probe.status !== 401) {
      throw probe.ok
        ? new AuthError('misconfigured', {
            message: 'verifyUrl не запрашивает авторизацию',
          })
        : await AuthError.fromResponse(probe);
    }
    const challenge = this.#selectChallenge(
      probe.headers.get('WWW-Authenticate'),
    );
    if (!challenge) {
      throw new AuthError('misconfigured', {
        message: 'Сервер не предложил поддерживаемый Digest',
      });
    }

    const credentials: DigestCredentials = {
      username,
      realm: challenge.realm,
      algorithm: challenge.algorithm,
      isSession: challenge.isSession,
      secret: await this.#hash(
        challenge.algorithm,
        `${username}:${challenge.realm}:${password}`,
      ),
      nonce: challenge.nonce,
      opaque: challenge.opaque,
      counter: 0,
    };
    const { headers } = await this.decorate(credentials, {
      url: this.#options.verifyUrl,
      method: 'GET',
    });
    const response = await this.#send(headers ?? {}, context.signal);
    if (!response.ok) throw await AuthError.fromResponse(response);
    return { credentials, user: await this.#options.parseUser?.(response) };
  }

  async decorate(
    credentials: DigestCredentials,
    target: AuthTarget,
  ): Promise<AuthDecoration> {
    // Счётчик увеличивается до первого await: у параллельных запросов он не совпадёт.
    credentials.counter += 1;
    const {
      username,
      realm,
      secret,
      algorithm,
      isSession,
      nonce,
      opaque,
      counter,
    } = credentials;
    const nc = counter.toString(16).padStart(8, '0');
    const cnonce = randomHex(16);
    const url = new URL(target.url, 'https://digest.invalid');
    const uri = `${url.pathname}${url.search}`;

    const ha1 = isSession
      ? await this.#hash(algorithm, `${secret}:${nonce}:${cnonce}`)
      : secret;
    const ha2 = await this.#hash(
      algorithm,
      `${target.method.toUpperCase()}:${uri}`,
    );
    const response = await this.#hash(
      algorithm,
      `${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`,
    );

    const parts = [
      // Не-ASCII логин передаётся расширенным параметром (RFC 7616, 3.4).
      isAscii(username)
        ? `username=${quote(username)}`
        : `username*=UTF-8''${encodeURIComponent(username)}`,
      `realm=${quote(realm)}`,
      `uri=${quote(uri)}`,
      `algorithm=${algorithm}${isSession ? '-sess' : ''}`,
      `nonce=${quote(nonce)}`,
      `nc=${nc}`,
      `cnonce=${quote(cnonce)}`,
      'qop=auth',
      `response=${quote(response)}`,
    ];
    if (opaque !== undefined) parts.push(`opaque=${quote(opaque)}`);
    return {
      headers: { Authorization: `Digest ${parts.join(', ')}` },
      credentialsMode: 'omit',
    };
  }

  assess(
    response: AuthResponseInfo,
    credentials: DigestCredentials,
  ): AuthVerdict {
    if (response.status !== 401) {
      this.#applyNextNonce(response.header('Authentication-Info'), credentials);
      return { action: 'pass' };
    }
    const challenge = this.#selectChallenge(
      response.header('WWW-Authenticate'),
    );
    // Только `stale` означает «пароль верный, обнови nonce». Иначе реквизиты отвергнуты.
    if (!challenge?.isStale || challenge.realm !== credentials.realm)
      return { action: 'reject' };
    credentials.nonce = challenge.nonce;
    credentials.opaque = challenge.opaque;
    credentials.counter = 0;
    return { action: 'retry' };
  }

  #applyNextNonce(header: null | string, credentials: DigestCredentials): void {
    if (!header) return;
    const nextNonce = parseChallenges(`Digest ${header}`)[0]?.params.get(
      'nextnonce',
    );
    if (!nextNonce) return;
    credentials.nonce = nextNonce;
    credentials.counter = 0;
  }

  #selectChallenge(header: null | string): DigestChallenge | null {
    if (!header) return null;
    for (const { scheme, params } of parseChallenges(header)) {
      if (scheme !== 'digest') continue;
      const realm = params.get('realm');
      const nonce = params.get('nonce');
      const qop = params
        .get('qop')
        ?.split(',')
        .map((value) => value.trim().toLowerCase());
      const rawAlgorithm = (params.get('algorithm') ?? 'MD5').toUpperCase();
      const isSession = rawAlgorithm.endsWith('-SESS');
      const algorithm = isSession
        ? rawAlgorithm.slice(0, -'-SESS'.length)
        : rawAlgorithm;
      if (
        !realm ||
        !nonce ||
        !qop?.includes('auth') ||
        !this.#hashers.has(algorithm)
      )
        continue;
      return {
        realm,
        nonce,
        opaque: params.get('opaque'),
        algorithm,
        isSession,
        isStale: params.get('stale')?.toLowerCase() === 'true',
      };
    }
    return null;
  }

  async #hash(algorithm: string, text: string): Promise<string> {
    const hasher = this.#hashers.get(algorithm);
    if (!hasher)
      throw new AuthError('misconfigured', {
        message: `Нет алгоритма ${algorithm}`,
      });
    return hasher(text);
  }

  #send(
    headers: Readonly<Record<string, string>>,
    signal: AbortSignal,
  ): Promise<Response> {
    const send = this.#options.fetch ?? globalThis.fetch;
    return send(this.#options.verifyUrl, {
      headers,
      signal,
      credentials: 'omit',
    });
  }
}
