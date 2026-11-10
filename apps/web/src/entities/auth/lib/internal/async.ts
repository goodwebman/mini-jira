import { AuthError } from '../errors';

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason;
}

/**
 * Ждёт общий промис, но отпускает вызывающего по его собственному сигналу.
 * Отмена одного запроса не должна отменять refresh, которого ждут остальные.
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Гарантирует завершение, даже если задача игнорирует сигнал. Иначе зависший refresh запрёт очередь. */
export function withDeadline<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AuthError('timeout', { message: `Операция не завершилась за ${timeoutMs} мс` }));
      controller.abort();
    }, timeoutMs);
    (async () => task(controller.signal))()
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

/** Экспоненциальная пауза со случайным разбросом, чтобы вкладки не били в сервер разом. */
export class Backoff {
  readonly #baseMs: number;
  readonly #maxMs: number;
  #attempts = 0;

  constructor(baseMs: number, maxMs: number) {
    this.#baseMs = baseMs;
    this.#maxMs = maxMs;
  }

  next(): number {
    const ceiling = Math.min(this.#maxMs, this.#baseMs * 2 ** this.#attempts);
    this.#attempts += 1;
    return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
  }

  reset(): void {
    this.#attempts = 0;
  }
}

/** Выполняет записи строго по порядку: медленный save не перетрёт следующий за ним clear. */
export class SerialQueue {
  readonly #onError: (error: unknown) => void;
  #tail: Promise<void> = Promise.resolve();

  constructor(onError: (error: unknown) => void) {
    this.#onError = onError;
  }

  add(task: () => void | Promise<void>): void {
    this.#tail = this.#tail.then(task).catch(this.#onError);
  }

  idle(): Promise<void> {
    return this.#tail;
  }
}
