import type { TaskTimerView } from '@/entities/task';
import { UIButton, UIIconButton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { useToggleTaskPause } from '../model/use-toggle-task-pause';

/**
 * Кнопка паузы. На карточке — круглая иконка поверх ссылки карточки,
 * на странице задачи — полноразмерная кнопка в блоке таймера.
 */
export function TaskPauseButton({
  taskKey,
  timer,
  variant = 'icon',
}: {
  readonly taskKey: string;
  readonly timer: TaskTimerView;
  readonly variant?: 'full' | 'icon';
}) {
  const { toggle, pendingKey } = useToggleTaskPause();
  if (!timer.canToggle) return null;

  const label = timer.isPaused ? 'Продолжить' : 'Поставить на паузу';
  const Icon = timer.isPaused ? UIIcons.Play : UIIcons.Pause;
  const onClick = () => toggle(taskKey, timer.isPaused);
  const busy = pendingKey === taskKey;

  if (variant === 'full')
    return (
      <UIButton variant='secondary' loading={busy} onClick={onClick}>
        <Icon />
        {label}
      </UIButton>
    );

  return (
    <UIIconButton
      label={`${label}: ${taskKey}`}
      title={label}
      variant='secondary'
      size='xs'
      shape='round'
      disabled={busy}
      onClick={onClick}
    >
      <Icon />
    </UIIconButton>
  );
}
