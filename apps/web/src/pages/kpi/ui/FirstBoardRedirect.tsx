import { useSuspenseQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';

import { boardsQueryOptions } from '@/entities/board';
import { ROUTES } from '@/shared/routes';
import { UIEmptyState } from '@/shared/ui';

/** Пользователь ещё не открывал доски: берём первую из списка. */
export function FirstBoardRedirect() {
  const { data } = useSuspenseQuery(boardsQueryOptions());
  const first = data.items[0];
  if (!first)
    return (
      <UIEmptyState
        boxed
        title='Досок пока нет'
        description='Создайте доску или попросите коллег добавить вас, и здесь появятся метрики спринта.'
      />
    );
  return <Navigate replace to={ROUTES.KPI.build({ boardId: first.id })} />;
}
