import type { TaskDetail } from '@gwmt/contracts';

import { UICheckbox } from '@/shared/ui';

import { useTakeLock } from '../model/use-take-lock';

/** Чекбокс «Запретить брать в работу». Только администратор и только в «К работе». */
export function TaskTakeLockToggle({
  task,
}: {
  readonly task: Pick<TaskDetail, 'isTakeLocked' | 'key'>;
}) {
  const { setLocked, pendingLocked } = useTakeLock(task.key);
  return (
    <UICheckbox
      label='Запретить брать в работу'
      checked={pendingLocked ?? task.isTakeLocked}
      disabled={pendingLocked !== null}
      onCheckedChange={setLocked}
    />
  );
}
