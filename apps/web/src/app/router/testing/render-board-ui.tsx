import type { ReactElement } from 'react';

import { vi } from 'vitest';

import {
  CurrentBoardInjector,
  createCurrentBoardStore,
} from '@/entities/board';
import {
  BoardWorkspaceProvider,
  createBoardWorkspaceStore,
} from '@/features/board/workspace';
import { renderAt } from '@/shared/lib/testing';
import { ROUTES } from '@/shared/routes';
import { AppShellInjector } from '@/widgets/app-shell';

export function createBoardUiMocks(boardId: number) {
  const currentBoard = createCurrentBoardStore({
    persistence: { load: () => null, save: vi.fn(), clear: vi.fn() },
  });
  const workspace = createBoardWorkspaceStore({ boardId });

  return {
    currentBoard: { ...currentBoard, remember: vi.fn(currentBoard.remember) },
    workspace: { ...workspace, updateFilters: vi.fn(workspace.updateFilters) },
    shell: { openBoardsSwitcher: vi.fn() },
  };
}

export function renderBoardUi(
  element: ReactElement,
  { currentBoard, workspace, shell }: ReturnType<typeof createBoardUiMocks>,
) {
  return renderAt(
    <CurrentBoardInjector value={currentBoard}>
      <AppShellInjector value={shell}>
        <BoardWorkspaceProvider createStore={() => workspace}>
          {element}
        </BoardWorkspaceProvider>
      </AppShellInjector>
    </CurrentBoardInjector>,
    { path: ROUTES.BOARD.path, url: ROUTES.BOARD.build(workspace.boardId) },
  );
}
