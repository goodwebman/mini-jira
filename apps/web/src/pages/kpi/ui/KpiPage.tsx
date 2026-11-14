import { useSearchParams } from 'react-router';

import { useCurrentBoardId } from '@/entities/board';
import { AsyncBoundary } from '@/shared/lib/react';
import { parseIdParam } from '@/shared/routes';
import { UIRequestError } from '@/shared/ui';
import { ShellPage } from '@/widgets/app-shell';
import { KpiSkeleton } from '@/widgets/kpi-dashboard';

import { CurrentSprintRedirect } from './CurrentSprintRedirect';
import { FirstBoardRedirect } from './FirstBoardRedirect';
import { KpiScreen } from './KpiScreen';

/**
 * KPI спринта. Доска и спринт берутся из адреса (`?board=&sprint=`), чтобы
 * метрики можно было отправить ссылкой. Без адреса — текущая доска,
 * без неё — первая доступная; спринт по умолчанию — текущий спринт доски.
 */
export function KpiPage() {
  const [params] = useSearchParams();
  const currentBoardId = useCurrentBoardId();
  const boardId =
    parseIdParam(params.get('board') ?? undefined) ?? currentBoardId;
  const sprint = parseIdParam(params.get('sprint') ?? undefined);

  return (
    <ShellPage title='KPI' caption='Метрики выбранного спринта'>
      <AsyncBoundary
        resetKeys={[boardId, sprint]}
        fallback={<KpiSkeleton />}
        renderError={({ error, retry }) => (
          <UIRequestError
            error={error}
            retry={retry}
            notFoundTitle='Спринт не найден или доска недоступна'
          />
        )}
      >
        {boardId === null && <FirstBoardRedirect />}
        {boardId !== null && sprint === null && (
          <CurrentSprintRedirect boardId={boardId} />
        )}
        {boardId !== null && sprint !== null && (
          <KpiScreen boardId={boardId} sprint={sprint} />
        )}
      </AsyncBoundary>
    </ShellPage>
  );
}
