import type { AuthEvent, AuthState, Unsubscribe } from './types';

/** После такого события кэши с данными пользователя нужно сбросить. */
export function isSessionBoundary<TUser>(event: AuthEvent<TUser>): boolean {
  return (
    event.type === 'logout' ||
    event.type === 'kick' ||
    (event.type === 'login' && event.identityChanged)
  );
}

/**
 * Состояние и подписчики. Объект снимка меняется только при реальном изменении,
 * поэтому его можно отдавать прямо в `useSyncExternalStore`.
 */
export class AuthStore<TUser> {
  readonly #stateListeners = new Set<() => void>();
  readonly #eventListeners = new Set<(event: AuthEvent<TUser>) => void>();
  readonly #deliveries: (() => void)[] = [];
  readonly #onListenerError: (error: unknown) => void;
  #state: AuthState<TUser> = Object.freeze({
    status: 'unknown',
    phase: 'idle',
    user: null,
    error: null,
    updatedAt: null,
  });
  #delivering = false;

  constructor(onListenerError: (error: unknown) => void) {
    this.#onListenerError = onListenerError;
  }

  get state(): AuthState<TUser> {
    return this.#state;
  }

  patch(next: Partial<AuthState<TUser>>): void {
    const current = this.#state;
    const merged = { ...current, ...next };
    const keys = Object.keys(merged) as (keyof AuthState<TUser>)[];
    if (keys.every((key) => Object.is(current[key], merged[key]))) return;
    this.#state = Object.freeze(merged);
    this.#deliver([...this.#stateListeners], (listener) => listener());
  }

  emit(event: AuthEvent<TUser>): void {
    this.#deliver([...this.#eventListeners], (listener) => listener(event));
  }

  subscribe(listener: () => void): Unsubscribe {
    this.#stateListeners.add(listener);
    return () => this.#stateListeners.delete(listener);
  }

  on(listener: (event: AuthEvent<TUser>) => void): Unsubscribe {
    this.#eventListeners.add(listener);
    return () => this.#eventListeners.delete(listener);
  }

  clear(): void {
    this.#stateListeners.clear();
    this.#eventListeners.clear();
  }

  // Упавший подписчик не должен ломать выход и остальных подписчиков. Вложенные вызовы
  // встают в очередь, чтобы все видели события в одном порядке.
  #deliver<TListener>(
    listeners: TListener[],
    call: (listener: TListener) => void,
  ): void {
    this.#deliveries.push(() => {
      for (const listener of listeners) {
        try {
          call(listener);
        } catch (error) {
          this.#onListenerError(error);
        }
      }
    });
    if (this.#delivering) return;
    this.#delivering = true;
    try {
      while (this.#deliveries.length > 0) this.#deliveries.shift()?.();
    } finally {
      this.#delivering = false;
    }
  }
}
