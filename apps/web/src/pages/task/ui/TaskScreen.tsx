import { useSuspenseQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';

import { BoardReadOnlyBanner, getBoardPermissions } from '@/entities/board';
import { taskQueryOptions } from '@/entities/task';
import { ROUTES } from '@/shared/routes';
import { ShellPage } from '@/widgets/app-shell';
import { TaskView } from '@/widgets/task-detail';

export function TaskScreen({
  taskKey,
  boardId,
}: {
  readonly taskKey: string;
  readonly boardId: number;
}) {
  const navigate = useNavigate();
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskKey));
  // Задачу открыли по чужому адресу доски: ведём на её настоящую доску
  if (task.board.id !== boardId)
    return (
      <Navigate replace to={ROUTES.BOARD_TASK.build(task.board.id, task.key)} />
    );
  return (
    <ShellPage
      title={task.key}
      caption={task.board.name}
      onBack={() => void navigate(ROUTES.BOARD.build(task.board.id))}
      banner={
        getBoardPermissions(task.myRole).isReadOnly && <BoardReadOnlyBanner />
      }
    >
      <TaskView task={task} />
    </ShellPage>
  );
}
