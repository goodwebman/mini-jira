import { type FormEvent, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { boardsQueryOptions } from '@/entities/board';
import { boardSprintsQueryOptions, formatSprintDates } from '@/entities/sprint';
import { formatNumber } from '@/shared/lib/format';
import {
  UIButton,
  UIDialog,
  UIField,
  UIOptionCard,
  UISelect,
  UISkeleton,
} from '@/shared/ui';

import type { KpiSelection } from '../model/selection';

export function PickerForm({
  initial,
  onSubmit,
}: {
  readonly initial: KpiSelection;
  readonly onSubmit: (selection: KpiSelection) => void;
}) {
  const [boardId, setBoardId] = useState(initial.boardId);
  // null: при смене доски выбирается её текущий (первый в списке) спринт
  const [sprint, setSprint] = useState<null | number>(initial.sprint);
  const boards = useQuery(boardsQueryOptions());
  const sprints = useQuery(boardSprintsQueryOptions(boardId, { limit: 8 }));
  const items = sprints.data?.items ?? [];
  const selected = sprint ?? items[0]?.number ?? null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected !== null) onSubmit({ boardId, sprint: selected });
  };

  return (
    <UIDialog.Content title='Доска и спринт' size='sm'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='flex flex-col gap-4'>
          <UIField label='Доска'>
            <UISelect
              value={String(boardId)}
              options={(boards.data?.items ?? []).map((board) => ({
                value: String(board.id),
                label: board.name,
              }))}
              onValueChange={(next) => {
                setBoardId(Number(next));
                setSprint(null);
              }}
            />
          </UIField>
          <UIField label='Спринт'>
            <div role='group' className='flex flex-col gap-1'>
              {sprints.isPending
                ? ['a', 'b', 'c'].map((key) => (
                    <UISkeleton key={key} className='h-14' />
                  ))
                : items.map((item) => (
                    <UIOptionCard
                      key={item.id}
                      title={`Спринт ${String(item.number)}`}
                      meta={`${formatSprintDates(item)} · ${item.state === 'active' ? 'идёт' : 'завершён'}`}
                      aside={`${formatNumber(item.doneSp)} из ${formatNumber(item.scopeSp)} SP`}
                      selected={item.number === selected}
                      onClick={() => setSprint(item.number)}
                    />
                  ))}
            </div>
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close>Отмена</UIDialog.Close>
          <UIButton type='submit' disabled={selected === null}>
            Показать KPI
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
