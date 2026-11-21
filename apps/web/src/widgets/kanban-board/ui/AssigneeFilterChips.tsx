import type { BoardMember } from '@gwmt/contracts';

import { UserChip } from '@/entities/user';
import { UIChip } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

export interface IAssigneeFilterChipsProps {
  /** Кого можно выбрать: участники без гостей. */
  readonly people: readonly BoardMember[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (userId: string) => void;
  readonly onClear: () => void;
  /** «+ Добавить» ведёт к участникам; без обработчика кнопки нет. */
  readonly onAddPeople?: () => void;
}

/** Фильтр доски по людям: «Все», чип на каждого участника и «Добавить». */
export function AssigneeFilterChips({
  people,
  selectedIds,
  onToggle,
  onClear,
  onAddPeople,
}: IAssigneeFilterChipsProps) {
  const selected = new Set(selectedIds);
  return (
    <>
      <UIChip pressed={selectedIds.length === 0} onClick={onClear}>
        Все
      </UIChip>
      {people.map((member) => (
        <UserChip
          key={member.id}
          user={member}
          pressed={selected.has(member.id)}
          onToggle={() => onToggle(member.id)}
        />
      ))}
      {onAddPeople && (
        <UIChip variant='dashed' onClick={onAddPeople}>
          <UIIcons.Plus className='size-icon-sm' />
          Добавить
        </UIChip>
      )}
    </>
  );
}
