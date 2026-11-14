import type { Me } from '@gwmt/contracts';

import { useAuth } from './use-auth';

/**
 * Пользователь в защищённой зоне. Гард роутера не пускает туда без профиля,
 * поэтому `null` здесь — ошибка сборки дерева, а не состояние для интерфейса.
 */
export function useSessionUser(): Me {
  const { user } = useAuth();
  if (!user)
    throw new Error(
      'useSessionUser: вызов вне защищённой зоны или до загрузки профиля.',
    );
  return user;
}
