import { useParams } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import {
  BoardWorkspaceProvider,
  createBoardWorkspaceStore,
  parseStoredBoardFilters,
} from '@/features/board/workspace';
import { NotFoundPage } from '@/pages/not-found';
import {
  createStoragePersistence,
  getBrowserStorage,
} from '@/shared/lib/store';
import { parseIdParam } from '@/shared/routes';

import { BoardOutlet } from './BoardOutlet';

/**
 * Cross-module scope доски.
 *
 * Роут знает, что нужно модулю (id доски из адреса),
 * провайдер — только как хранить. `Outlet` внутри провайдера: канбан,
 * участники и задача делят стор рабочего пространства.
 * Соседние роуты («Мои задачи», KPI) к стору доступа не имеют.
 * Другая доска — другой `key` и новый стор.
 */
export function BoardScope() {
  const user = useSessionUser();
  const boardId = parseIdParam(useParams().boardId);
  if (boardId === null) return <NotFoundPage />;
  return (
    <BoardWorkspaceProvider
      key={`${user.id}:${boardId}`}
      createStore={() =>
        createBoardWorkspaceStore({
          boardId,
          filterPersistence: createStoragePersistence(
            getBrowserStorage('localStorage'),
            `mini-jira:${user.id}:board:${boardId}:filters`,
            parseStoredBoardFilters,
          ),
        })
      }
    >
      <BoardOutlet />
    </BoardWorkspaceProvider>
  );
}
