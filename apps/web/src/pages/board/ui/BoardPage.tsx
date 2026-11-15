import { Link } from 'react-router';

import { useBoardWorkspaceStore } from '@/features/board/workspace';
import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIPageHeader, UIRequestError, buttonVariants } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { ShellPageSkeleton } from '@/widgets/app-shell';
import { BoardSkeleton } from '@/widgets/kanban-board';

import { BoardScreen } from './BoardScreen';

export function BoardPage() {
  // Только id: обёртке не нужно перерисовываться на каждый символ в поиске
  const { boardId } = useBoardWorkspaceStore();
  return (
    <AsyncBoundary
      fallback={
        <ShellPageSkeleton
          label='Загрузка доски'
          scroll='fixed'
          actions={
            <UIPageHeader.ActionSkeleton
              icon={<UIIcons.Plus />}
              label='Создать задачу'
            />
          }
        >
          <BoardSkeleton />
        </ShellPageSkeleton>
      }
      renderError={({ error, retry }) => (
        <UIRequestError
          error={error}
          retry={retry}
          notFoundTitle='Доска не найдена или недоступна'
          notFoundAction={
            <Link to={ROUTES.BOARDS.build()} className={buttonVariants()}>
              К списку досок
            </Link>
          }
        />
      )}
    >
      <BoardScreen boardId={boardId} />
    </AsyncBoundary>
  );
}
