import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { sprintKpiQueryOptions } from '@/entities/sprint';
import { ROUTES } from '@/shared/routes';
import { KpiDashboard } from '@/widgets/kpi-dashboard';

/** Данные выбранного спринта и запись выбора в адрес после разрешения редиректов. */
export function KpiScreen({
  boardId,
  sprint,
}: {
  readonly boardId: number;
  readonly sprint: number;
}) {
  const navigate = useNavigate();
  const { data: kpi } = useSuspenseQuery(
    sprintKpiQueryOptions(boardId, sprint),
  );

  return (
    <KpiDashboard
      boardId={boardId}
      sprint={sprint}
      kpi={kpi}
      onSelect={(selection) => void navigate(ROUTES.KPI.build(selection))}
    />
  );
}
