import { useState } from 'react';

import { Outlet } from 'react-router';

import {
  CurrentBoardInjector,
  createCurrentBoardStore,
  parseStoredBoardId,
} from '@/entities/board';
import {
  createStoragePersistence,
  getBrowserStorage,
} from '@/shared/lib/store';

/**
 * Стор текущей доски одного пользователя. Зависимости собирает слой `app`:
 * сущность не знает ни про localStorage, ни про формат ключа.
 */
export function CurrentBoardProvider({ userId }: { readonly userId: string }) {
  const [store] = useState(() =>
    createCurrentBoardStore({
      persistence: createStoragePersistence(
        getBrowserStorage('localStorage'),
        `mini-jira:${userId}:current-board`,
        parseStoredBoardId,
      ),
    }),
  );
  return (
    <CurrentBoardInjector value={store}>
      <Outlet />
    </CurrentBoardInjector>
  );
}
