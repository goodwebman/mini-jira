import { useSuspenseQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';

import { taskQueryOptions } from '@/entities/task';
import { ROUTES } from '@/shared/routes';

export function TaskRedirect({ taskKey }: { readonly taskKey: string }) {
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskKey));
  return (
    <Navigate replace to={ROUTES.BOARD_TASK.build(task.board.id, task.key)} />
  );
}
