import { useSuspenseQuery } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';

import { taskQueryOptions } from '@/entities/task';
import { ROUTES } from '@/shared/routes';

export function TaskRedirect({ taskKey }: { readonly taskKey: string }) {
  const { hash, search } = useLocation();
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskKey));
  return (
    <Navigate
      replace
      to={{
        pathname: ROUTES.BOARD_TASK.build(task.board.id, task.key),
        search,
        hash,
      }}
    />
  );
}
