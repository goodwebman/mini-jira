import { useSessionUser } from '@/entities/auth';

import { CurrentBoardProvider } from './CurrentBoardProvider';

/**
 * Global scope сессии: «текущая доска» своя у каждого пользователя.
 * `key` по id: вошёл другой человек (даже в соседней вкладке, без выхода
 * в промежутке) — новый стор, чужая доска не всплывёт.
 */
export function CurrentBoardScope() {
  const user = useSessionUser();
  return <CurrentBoardProvider key={user.id} userId={user.id} />;
}
