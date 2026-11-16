import { type NotificationType, TASK_STATUS_LABELS } from '@gwmt/contracts';

import type { TaskRow } from '../../db/schema.js';

export interface TaskNotice {
  type: NotificationType;
  message: string;
}

const PEOPLE = {
  authorId: 'автор',
  reviewerId: 'ревьювер',
  testerId: 'тестировщик',
  designerId: 'дизайнер',
} as const;

export function taskParticipants(task: TaskRow): string[] {
  return [
    ...new Set([
      task.createdBy,
      ...Object.keys(PEOPLE).map((field) => task[field as keyof typeof PEOPLE]),
    ]),
  ].filter((id): id is string => id !== null);
}

export function taskChangeNotices(before: TaskRow | undefined, after: TaskRow) {
  const notices = new Map<string, TaskNotice>();
  const changed =
    before &&
    ['title', 'description', 'priority', 'sp', ...Object.keys(PEOPLE)].some(
      (field) =>
        before[field as keyof TaskRow] !== after[field as keyof TaskRow],
    );
  if (changed) {
    for (const id of new Set([
      ...taskParticipants(before),
      ...taskParticipants(after),
    ])) {
      notices.set(id, { type: 'task_updated', message: 'Изменена задача' });
    }
  }
  const roles = new Map<string, string[]>();
  for (const field of Object.keys(PEOPLE) as (keyof typeof PEOPLE)[]) {
    if (before?.[field] === after[field]) continue;
    const previous = before?.[field];
    if (previous)
      notices.set(previous, {
        type: 'task_unassigned',
        message: `Вы больше не ${PEOPLE[field]} задачи`,
      });
    const next = after[field];
    if (next) roles.set(next, [...(roles.get(next) ?? []), PEOPLE[field]]);
  }
  for (const [id, labels] of roles) {
    notices.set(id, {
      type: 'task_assigned',
      message: `Вам назначена роль в задаче: ${labels.join(', ')}`,
    });
  }
  if (before && before.status !== after.status) {
    let type: NotificationType = 'task_status_changed';
    let message = `Статус задачи: ${TASK_STATUS_LABELS[before.status]} → ${TASK_STATUS_LABELS[after.status]}`;
    if (before.status === 'review' && ['todo', 'work'].includes(after.status)) {
      type = 'task_review_rejected';
      message = 'Задача не прошла ревью и возвращена на доработку';
    }
    if (
      before.status === 'test' &&
      ['todo', 'work', 'review'].includes(after.status)
    ) {
      type = 'task_test_failed';
      message = 'Задача не прошла тестирование и возвращена на доработку';
    }
    for (const id of taskParticipants(after)) {
      const assignment = notices.get(id);
      notices.set(id, {
        type,
        message:
          assignment?.type === 'task_assigned'
            ? `${message}. ${assignment.message}`
            : message,
      });
    }
  }
  return notices;
}
