import { Fragment, type ReactNode } from 'react';

import type { TaskDetail, UpdateTaskBody } from '@gwmt/contracts';

import { TaskPrioritySelect } from '@/entities/task';
import { NOBODY, UserSelect } from '@/entities/user';

import type { TaskPropertyRow } from '../model/property-row';
import { useUpdateTask } from '../model/use-update-task';
import { TaskSpField } from './TaskSpField';

type PeopleField = 'authorId' | 'designerId' | 'reviewerId' | 'testerId';

const PEOPLE: readonly {
  readonly field: PeopleField;
  readonly label: string;
  readonly role: keyof TaskDetail['people'];
  readonly optional: boolean;
}[] = [
  { field: 'authorId', label: 'Автор', role: 'author', optional: false },
  { field: 'reviewerId', label: 'Ревьювер', role: 'reviewer', optional: false },
  { field: 'testerId', label: 'Тестировщик', role: 'tester', optional: true },
  { field: 'designerId', label: 'Дизайнер', role: 'designer', optional: true },
];

/**
 * Редактируемые свойства для администратора: приоритет, оценка и люди.
 * Фича отдаёт строки «подпись — поле», раскладку задаёт страница через `renderRow`.
 */
export function TaskPropertyEditors({
  task,
  renderRow,
  overEstimate = false,
}: {
  readonly task: TaskDetail;
  readonly renderRow: (row: TaskPropertyRow) => ReactNode;
  readonly overEstimate?: boolean;
}) {
  const { update, pending } = useUpdateTask(task.key);
  const value = <K extends keyof UpdateTaskBody>(
    field: K,
    fallback: NonNullable<UpdateTaskBody[K]> | null,
  ) => (pending && field in pending ? pending[field] : fallback);

  const rows: TaskPropertyRow[] = [
    {
      id: 'task-priority',
      label: 'Приоритет',
      control: (
        <TaskPrioritySelect
          id='task-priority'
          value={value('priority', task.priority) ?? task.priority}
          onValueChange={(priority) => update({ priority })}
        />
      ),
    },
    {
      id: 'task-sp',
      label: 'Оценка, SP',
      control: (
        <TaskSpField
          overEstimate={overEstimate}
          id='task-sp'
          value={value('sp', task.sp) ?? task.sp}
          onCommit={(sp) => update({ sp })}
        />
      ),
    },
    ...PEOPLE.map(({ field, label, role, optional }) => ({
      id: `task-${role}`,
      label,
      control: (
        <UserSelect
          id={`task-${role}`}
          users={task.assigneeOptions}
          optional={optional}
          value={value(field, task.people[role]?.id ?? null) ?? NOBODY}
          onValueChange={(userId) =>
            update({ [field]: userId === NOBODY ? null : userId })
          }
        />
      ),
    })),
  ];
  return rows.map((row) => <Fragment key={row.id}>{renderRow(row)}</Fragment>);
}
