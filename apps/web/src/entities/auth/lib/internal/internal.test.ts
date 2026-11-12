// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError, isAuthError, toAuthError } from '../errors';
import { describeResponse, describeThrown } from '../response-info';
import { deferred, flush } from '../testing/test-kit';
import { Backoff, SerialQueue, abortable, withDeadline } from './async';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AuthError', () => {
  it.each([
    [401, 'unauthorized', false],
    [403, 'forbidden', false],
    [404, 'bad_request', false],
    [422, 'bad_request', false],
    [429, 'rate_limited', true],
    [500, 'server', true],
    [503, 'server', true],
  ])('статус %i: код %s, повторяемая: %s', (status, code, retryable) => {
    const error = AuthError.fromStatus(status);
    expect(error).toMatchObject({ code, status, retryable });
  });

  it('читает код сервера и Retry-After', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'TOO_MANY', message: 'Подождите' } }),
      {
        status: 429,
        headers: { 'Retry-After': '30' },
      },
    );
    const error = await AuthError.fromResponse(response, (body) => {
      const { code, message } = (
        body as { error: { code: string; message: string } }
      ).error;
      return { serverCode: code, message };
    });
    expect(error).toMatchObject({
      code: 'rate_limited',
      serverCode: 'TOO_MANY',
      message: 'Подождите',
      retryAfterMs: 30_000,
    });
  });

  it('Retry-After в виде даты', async () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    const response = new Response('', {
      status: 503,
      headers: { 'Retry-After': 'Thu, 01 Jan 2026 00:01:00 GMT' },
    });
    expect((await AuthError.fromResponse(response)).retryAfterMs).toBe(60_000);
  });

  it('битое тело не мешает получить ошибку', async () => {
    const read = vi.fn(() => null);
    const error = await AuthError.fromResponse(
      new Response('<html>', { status: 500 }),
      read,
    );
    expect(error.code).toBe('server');
    expect(read).toHaveBeenCalledWith(null);
  });

  it('ошибка HTTP-клиента не попадает в cause: там может быть токен', () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      config: { headers: { Authorization: 'Bearer secret' } },
      response: { status: 401 },
    });
    const error = toAuthError(axiosError);
    expect(error.cause).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('secret');
  });

  it('обычная ошибка сохраняется в cause, но не в JSON', () => {
    const original = new TypeError('Failed to fetch');
    const error = toAuthError(original);
    expect(error.cause).toBe(original);
    expect(JSON.parse(JSON.stringify(error))).not.toHaveProperty('cause');
  });

  it('isAuthError различает типы', () => {
    expect(isAuthError(new AuthError('network'))).toBe(true);
    expect(isAuthError(new Error('x'))).toBe(false);
  });
});

describe('toAuthError', () => {
  it.each([
    ['AuthError как есть', new AuthError('forbidden'), 'forbidden'],
    ['AbortError', new DOMException('x', 'AbortError'), 'aborted'],
    ['TimeoutError', new DOMException('x', 'TimeoutError'), 'timeout'],
    ['поле status', { status: 401 }, 'unauthorized'],
    ['поле statusCode', { statusCode: 500 }, 'server'],
    ['как в axios', { response: { status: 403 } }, 'forbidden'],
    ['TypeError от fetch', new TypeError('Failed'), 'network'],
    ['строка', 'oops', 'unknown'],
    ['null', null, 'unknown'],
    ['статус вне диапазона', { status: 1000 }, 'unknown'],
    ['статус не число', { status: '401' }, 'unknown'],
  ])('%s', (_, input, code) => {
    expect(toAuthError(input).code).toBe(code);
  });
});

describe('abortable', () => {
  it('без сигнала возвращает тот же промис', () => {
    const promise = Promise.resolve(1);
    expect(abortable(promise, undefined)).toBe(promise);
  });

  it('отпускает вызывающего при отмене, не трогая сам промис', async () => {
    const source = deferred<string>();
    const controller = new AbortController();
    const waiting = abortable(source.promise, controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    source.resolve('still-fine');
    await expect(source.promise).resolves.toBe('still-fine');
  });

  it('снимает слушателя после завершения', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await abortable(Promise.resolve(1), controller.signal);
    await flush();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('withDeadline', () => {
  it('возвращает результат и не оставляет таймер', async () => {
    vi.useFakeTimers();
    await expect(withDeadline(1_000, async () => 'done')).resolves.toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('по таймауту отклоняется и отменяет задачу, даже если она игнорирует сигнал', async () => {
    vi.useFakeTimers();
    let received: AbortSignal | undefined;
    const pending = withDeadline(1_000, (signal) => {
      received = signal;
      return new Promise<void>(() => undefined);
    });
    const outcome = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await outcome).toMatchObject({ code: 'timeout' });
    expect(received?.aborted).toBe(true);
  });

  it('синхронное исключение превращается в отказ и не оставляет таймер', async () => {
    vi.useFakeTimers();
    await expect(
      withDeadline(1_000, () => {
        throw new Error('sync');
      }),
    ).rejects.toThrow('sync');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Backoff', () => {
  it('растёт экспоненциально с разбросом и упирается в потолок', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const backoff = new Backoff(1_000, 8_000);
    expect([
      backoff.next(),
      backoff.next(),
      backoff.next(),
      backoff.next(),
      backoff.next(),
    ]).toEqual([1_000, 2_000, 4_000, 8_000, 8_000]);
  });

  it('нижняя граница разброса равна половине', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(new Backoff(1_000, 8_000).next()).toBe(500);
  });

  it('reset начинает сначала', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const backoff = new Backoff(1_000, 8_000);
    backoff.next();
    backoff.next();
    backoff.reset();
    expect(backoff.next()).toBe(1_000);
  });
});

describe('SerialQueue', () => {
  it('выполняет задачи строго по порядку', async () => {
    const order: string[] = [];
    const gate = deferred();
    const queue = new SerialQueue(vi.fn());
    queue.add(async () => {
      await gate.promise;
      order.push('save');
    });
    queue.add(() => void order.push('clear'));
    await flush();
    expect(order).toEqual([]);
    gate.resolve();
    await queue.idle();
    expect(order).toEqual(['save', 'clear']);
  });

  it('ошибка докладывается и не останавливает очередь', async () => {
    const onError = vi.fn();
    const after = vi.fn();
    const queue = new SerialQueue(onError);
    queue.add(() => {
      throw new Error('disk full');
    });
    queue.add(after);
    await queue.idle();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });
});

describe('describeResponse', () => {
  it('понимает Response', async () => {
    const info = describeResponse(
      new Response('{"a":1}', { status: 401, headers: { 'X-Test': 'v' } }),
    );
    expect(info?.status).toBe(401);
    expect(info?.header('x-test')).toBe('v');
    await expect(info?.json()).resolves.toEqual({ a: 1 });
  });

  it('понимает ответ axios с заголовками объектом', async () => {
    const info = describeResponse({
      status: 401,
      headers: { 'x-test': 'v' },
      data: { a: 1 },
    });
    expect(info?.header('X-Test')).toBe('v');
    await expect(info?.json()).resolves.toEqual({ a: 1 });
  });

  it('понимает AxiosHeaders с методом get', () => {
    const headers = {
      get(this: { value: string }) {
        return this.value;
      },
      value: 'v',
    };
    expect(describeResponse({ status: 200, headers })?.header('x')).toBe('v');
  });

  it.each([null, undefined, 'x', 1, {}, { status: '200' }])(
    '%j: не ответ',
    (value) => {
      expect(describeResponse(value)).toBeNull();
    },
  );

  it('заголовков нет: null', () => {
    expect(describeResponse({ status: 200 })?.header('x')).toBeNull();
  });
});

describe('describeThrown', () => {
  it('берёт response из ошибки axios', () => {
    expect(describeThrown({ response: { status: 401 } })?.status).toBe(401);
  });

  it('берёт статус из самой ошибки', () => {
    expect(describeThrown({ status: 401 })?.status).toBe(401);
  });

  it('сетевая ошибка: не ответ', () => {
    expect(describeThrown(new TypeError('x'))).toBeNull();
    expect(describeThrown('x')).toBeNull();
  });
});
