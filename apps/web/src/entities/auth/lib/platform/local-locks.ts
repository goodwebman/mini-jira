import { withDeadline } from '../internal/async';

const noop = () => {};

/** Очередь FIFO внутри одной вкладки: запасной вариант, когда Web Locks недоступен. */
export class LocalLocks {
  readonly #tails = new Map<string, Promise<unknown>>();

  run<T>(name: string, task: () => Promise<T>, timeoutMs: number): Promise<T> {
    const previous = this.#tails.get(name) ?? Promise.resolve();
    const result = withDeadline(timeoutMs, () => previous).then(task);
    const settled = result.then(noop, noop);
    // A timed-out waiter must not release a lock still held by its predecessor.
    const tail = previous.then(() => settled);
    this.#tails.set(name, tail);
    void tail.then(() => {
      if (this.#tails.get(name) === tail) this.#tails.delete(name);
    });
    return result;
  }
}
