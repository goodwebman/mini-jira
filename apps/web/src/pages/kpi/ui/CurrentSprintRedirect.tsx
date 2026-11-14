import { useSuspenseQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';

import { boardQueryOptions } from '@/entities/board';
import { ROUTES } from '@/shared/routes';

export function CurrentSprintRedirect({
  boardId,
}: {
  readonly boardId: number;
}) {
  const { data: board } = useSuspenseQuery(boardQueryOptions(boardId));
  return (
    <Navigate
      replace
      to={ROUTES.KPI.build({ boardId, sprint: board.currentSprint.number })}
    />
  );
}
