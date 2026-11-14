import { TASK_LINK_LABELS, type TaskLinkItem } from '@gwmt/contracts';

import type { RenderElement } from '@/shared/lib/dom';
import { Slot } from '@/shared/lib/dom';
import { UIIconButton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { TaskStatusBadge } from './TaskStatusBadge';

export interface ITaskLinkRowProps {
  readonly link: TaskLinkItem;
  /** Ссылка на связанную задачу; без неё (нет доступа к доске) строка не кликабельна. */
  readonly render?: RenderElement;
  readonly onRemove?: () => void;
  /** Связь удаляется прямо сейчас: кнопка неактивна, повторный DELETE не уйдёт. */
  readonly removing?: boolean;
}

/** Строка связанной задачи: тип связи, ключ, название, статус. */
export function TaskLinkRow({
  link,
  render,
  onRemove,
  removing = false,
}: ITaskLinkRowProps) {
  const { task } = link;
  const content = (
    <>
      <span className='flex-none text-caption text-muted-foreground'>
        {TASK_LINK_LABELS[link.type]}
      </span>
      <span className='flex-none text-small font-medium text-muted-foreground'>
        {task.key}
      </span>
      <span className='min-w-0 flex-[1_1_120px] truncate font-medium'>
        {task.title}
      </span>
      <TaskStatusBadge status={task.status} />
    </>
  );
  const rowClass =
    'flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 py-2 text-foreground no-underline sm:flex-nowrap';

  return (
    <div className='flex min-h-control items-center gap-2 border-t border-border'>
      {render && task.canOpen ? (
        <Slot render={render} className={`${rowClass} focus-ring`}>
          {content}
        </Slot>
      ) : (
        <div
          className={rowClass}
          title={
            task.canOpen
              ? undefined
              : `Доска «${task.boardName}» вам недоступна`
          }
        >
          {content}
        </div>
      )}
      {onRemove && (
        <UIIconButton
          label={`Убрать связь с ${task.key}`}
          disabled={removing}
          onClick={onRemove}
        >
          <UIIcons.X />
        </UIIconButton>
      )}
    </div>
  );
}
