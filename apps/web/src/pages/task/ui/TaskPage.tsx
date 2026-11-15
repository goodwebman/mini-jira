import type { BoardDetail, BoardTasksResponse } from '@gwmt/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { boardQueryKeys } from '@/entities/board';
import { taskQueryKeys } from '@/entities/task';
import { useBoardWorkspaceStore } from '@/features/board/workspace';
import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIRequestError, buttonVariants } from '@/shared/ui';
import { ShellPageSkeleton } from '@/widgets/app-shell';
import { TaskSkeleton } from '@/widgets/task-detail';

import { TaskScreen } from './TaskScreen';

export function TaskPage() {
  const { taskKey = '' } = useParams();
  const { boardId } = useBoardWorkspaceStore();
  const client = useQueryClient();
  const board = client.getQueryData<BoardDetail>(
    boardQueryKeys.detail(boardId),
  );
  const task = client
    .getQueryData<BoardTasksResponse>(taskQueryKeys.board(boardId))
    ?.items.find((item) => item.key === taskKey);
  return (
    <AsyncBoundary
      resetKeys={[taskKey]}
      fallback={
        <ShellPageSkeleton label='Загрузка задачи' title={taskKey}>
          <TaskSkeleton task={task} role={board?.myRole} />
        </ShellPageSkeleton>
      }
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
