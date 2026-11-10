import { AuthError } from '../errors';
import { LocalLocks } from './local-locks';
import type { AuthPlatform } from './types';

const noop = () => undefined;

/**
 * Окружение без браузера: SSR, Node, тесты. На сервере создавайте отдельный
 * `AuthService` на каждый запрос: общий экземпляр отдаст токен одного пользователя другому.
 */
export function createMemoryPlatform(options: { origin?: string | null } = {}): AuthPlatform {
  const markers = new Set<string>();
  const locks = new LocalLocks();

  return {
    now: () => Date.now(),
    origin: () => options.origin ?? null,
    isVisible: () => true,
    withLock: (name, task, { timeoutMs }) => locks.run(name, task, timeoutMs),
    openChannel: () => null,
    onResume: () => noop,
    onOnline: () => noop,
    navigate: () => {
      throw new AuthError('misconfigured', { message: 'Редирект недоступен вне браузера' });
    },
    markers: {
      has: (key) => markers.has(key),
      set: (key) => void markers.add(key),
      delete: (key) => void markers.delete(key),
    },
  };
}
