/** Куда стор сохраняет состояние между перезагрузками. Подменяется в тестах. */
export interface Persistence<T> {
  readonly load: () => null | T;
  readonly save: (value: T) => void;
  readonly clear: () => void;
}

interface StorageLike {
  getItem: (key: string) => null | string;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * JSON в Web Storage. Битое или чужое значение не роняет приложение:
 * `parse` отбрасывает его, и стор стартует с состояния по умолчанию.
 * Ошибки квоты и приватного режима проглатываются — это кэш, не источник правды.
 */
export function createStoragePersistence<T>(
  storage: StorageLike | undefined,
  key: string,
  parse: (raw: unknown) => null | T,
): Persistence<T> {
  return {
    load: () => {
      try {
        const raw = storage?.getItem(key);
        return raw == null ? null : parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save: (value) => {
      try {
        storage?.setItem(key, JSON.stringify(value));
      } catch {
        // Квота или запрет хранилища: работаем без сохранения
      }
    },
    clear: () => {
      try {
        storage?.removeItem(key);
      } catch {
        // См. save
      }
    },
  };
}

/** Хранилище в памяти: для тестов и окружений без Web Storage. */
export function createMemoryPersistence<T>(
  initial: null | T = null,
): Persistence<T> {
  let value = initial;
  return {
    load: () => value,
    save: (next) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
  };
}

/** Безопасный доступ: в Safari с запретом cookies само обращение к хранилищу бросает. */
export function getBrowserStorage(
  kind: 'localStorage' | 'sessionStorage',
): Storage | undefined {
  try {
    return globalThis[kind];
  } catch {
    return undefined;
  }
}
