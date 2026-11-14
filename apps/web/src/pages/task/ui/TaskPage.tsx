import { Link, useParams } from 'react-router';

import { useBoardWorkspaceStore } from '@/features/board/workspace';
import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIRequestError, buttonVariants } from '@/shared/ui';
import { ShellPageSkeleton } from '@/widgets/app-shell';

import { TaskScreen } from './TaskScreen';

export function TaskPage() {
  const { taskKey = '' } = useParams();
  const { boardId } = useBoardWorkspaceStore();
  return (
    <AsyncBoundary
      resetKeys={[taskKey]}
      fallback={<ShellPageSkeleton label='Загрузка задачи' />}
      renderError={({ error, retry }) => (
        <UIRequestError
          error={error}
          retry={retry}
          notFoundTitle='Задача не найдена или недоступна'
          notFoundAction={
            <Link to={ROUTES.BOARD.build(boardId)} className={buttonVariants()}>
              Вернуться на доску
            </Link>
          }
        />
      )}
    >
      <TaskScreen taskKey={taskKey} boardId={boardId} />
    </AsyncBoundary>
  );
}
