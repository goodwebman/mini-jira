import { Outlet, useParams } from 'react-router';

import {
  BoardWorkspaceProvider,
  createBoardWorkspaceStore,
} from '@/features/board/workspace';
import { NotFoundPage } from '@/pages/not-found';
import { parseIdParam } from '@/shared/routes';

/**
 * Cross-module scope доски.
 *
 * Роут знает, что нужно модулю (id доски из адреса),
 * провайдер — только как хранить. `Outlet` внутри провайдера: канбан,
 * участники и задача делят один стор колонки и подсветки. Фильтры живут в URL.
 * Соседние роуты («Мои задачи», KPI) к стору доступа не имеют.
 * Другая доска — другой `key` и новый стор.
 */
export function BoardScope() {
  const boardId = parseIdParam(useParams().boardId);
  if (boardId === null) return <NotFoundPage />;
  return (
    <BoardWorkspaceProvider
      key={boardId}
      createStore={() => createBoardWorkspaceStore({ boardId })}
    >
      <Outlet />
    </BoardWorkspaceProvider>
  );
}
