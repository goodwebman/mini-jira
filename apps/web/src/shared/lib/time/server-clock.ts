import { useSyncExternalStore } from 'react';

import { createStore } from '../store';

/** Расхождение меньше секунды не меняет ни одной подписи таймера: не будим подписчиков зря. */
const NOISE_MS = 1000;

/**
 * Поправка часов клиента относительно сервера. Это свойство машины пользователя,
 * а не конкретного запроса, поэтому она одна на приложение.
 *
 * Считается в момент получения ответа: `serverTime − Date.now()`. Точечные записи
 * в кэш (`setQueryData` после паузы или комментария) её не трогают, поэтому таймеры
 * не уезжают на «возраст данных».
 */
export function createServerClock(now: () => number = Date.now) {
  const offset = createStore(0);
  return {
    offset,
    sync: (serverTime: string) => {
      const server = Date.parse(serverTime);
      if (!Number.isFinite(server)) return;
      const next = server - now();
      if (Math.abs(next - offset.getSnapshot()) >= NOISE_MS)
        offset.setState(next);
    },
  };
}

const serverClock = createServerClock();

/** Вызывается фетчерами с ответом, где есть `serverTime`. Возвращает ответ как есть. */
export function syncServerClock<T extends { readonly serverTime: string }>(
  response: T,
): T {
  serverClock.sync(response.serverTime);
  return response;
}

/** Текущая поправка в мс: для расчётов вне React. */
export function getServerClockOffset(): number {
  return serverClock.offset.getSnapshot();
}

export function useServerClockOffset(): number {
  return useSyncExternalStore(
    serverClock.offset.subscribe,
    serverClock.offset.getSnapshot,
    serverClock.offset.getSnapshot,
  );
}
