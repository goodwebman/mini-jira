import { useServerClockOffset } from './server-clock';
import { useNow } from './use-now';

/**
 * Время сервера: общие часы клиента плюс поправка из последнего ответа с `serverTime`.
 * Таймеры задач считаются от него, иначе у пользователя с неверными часами
 * задача «ждёт» отрицательное время.
 */
export function useServerNow(): number {
  return useNow() + useServerClockOffset();
}
