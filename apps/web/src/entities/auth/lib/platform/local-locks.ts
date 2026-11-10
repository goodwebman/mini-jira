const noop = () => undefined;

function waitAtMost(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    promise.finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Очередь FIFO внутри одной вкладки: запасной вариант, когда Web Locks недоступен. */
export class LocalLocks {
  readonly #tails = new Map<string, Promise<unknown>>();

  run<T>(name: string, task: () => Promise<T>, timeoutMs: number): Promise<T> {
    const previous = this.#tails.get(name) ?? Promise.resolve();
    const result = waitAtMost(previous, timeoutMs).then(task);
    this.#tails.set(name, result.catch(noop));
    return result;
  }
}
