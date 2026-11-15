import type { TaskDetail } from '@gwmt/contracts';

import {
  TASK_PRIORITY_LABELS,
  TASK_ROLE_OPTIONS,
  taskPeople,
} from '@/entities/task';
import { formatNumber } from '@/shared/lib/format';

import { TaskPropertyRow } from './TaskPropertyRow';

/** Свойства задачи текстом: для тех, кому редактирование недоступно. */
export function TaskReadOnlyProperties({
  task,
  overEstimate,
}: {
  readonly task: TaskDetail;
  readonly overEstimate: boolean;
}) {
  const assigned = new Map(
    taskPeople(task.people).map((person) => [person.role, person.user.name]),
  );
  return (
    <>
      <TaskPropertyRow label='Приоритет'>
        {TASK_PRIORITY_LABELS[task.priority]}
      </TaskPropertyRow>
      <TaskPropertyRow label='Оценка, SP'>
        <span
          className={
            overEstimate ? 'font-semibold text-destructive' : undefined
          }
        >
          {formatNumber(task.sp)}
        </span>
      </TaskPropertyRow>
      {TASK_ROLE_OPTIONS.map(({ value, label }) => (
        <TaskPropertyRow key={value} label={label}>
          {assigned.get(value) ?? 'Не назначен'}
        </TaskPropertyRow>
      ))}
    </>
  );
}
