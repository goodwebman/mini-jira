import { Link } from 'react-router';

import { useBoardWorkspaceStore } from '@/features/board/workspace';
import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIRequestError, buttonVariants } from '@/shared/ui';
import { ShellPageSkeleton } from '@/widgets/app-shell';

import { MembersScreen } from './MembersScreen';

export function BoardMembersPage() {
  const { boardId } = useBoardWorkspaceStore();
  return (
    <AsyncBoundary
      fallback={<ShellPageSkeleton label='Загрузка участников' />}
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
      <MembersScreen boardId={boardId} />
    </AsyncBoundary>
  );
}
