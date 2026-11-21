import {
  Children,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
} from 'react';

import { cn } from '@/shared/lib/cn';
import {
  STATUS_DOT_CLASS,
  type UITaskStatus,
} from '@/shared/ui/UIStatusBadge/status.styles';
import { UIIcons } from '@/shared/ui/icons';

export interface IUIKanbanColumnProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> {
  readonly testId?: string;
  readonly status: UITaskStatus;
  /** Название колонки; оно же её доступное имя. */
  readonly title: string;
  readonly count?: number;
  /** Подпись справа в шапке, например «12 SP». */
  readonly meta?: ReactNode;
  /** Текст пустой колонки. */
  readonly emptyText?: string;
  /** Если передан, после карточек появляется кнопка добавления. */
  readonly onAdd?: () => void;
  readonly addLabel?: string;
  /** Подсветка при перетаскивании: `ok` — можно бросить, `bad` — нельзя. */
  readonly dropState?: 'bad' | 'ok' | null;
}

/**
 * Колонка канбана. Обработчики drag-and-drop вешаются прямо на неё: `onDragOver`, `onDrop`.
 * На телефоне колонка без фона и шапки: выбор статуса делают через UIChip variant="status".
 *
 * @example
 * <UIKanbanColumn status="work" title="В работе" count={3} meta="13 SP" onAdd={add}>
 *   <UITaskCard … />
 * </UIKanbanColumn>
 */
const UIKanbanColumnBase = forwardRef<HTMLElement, IUIKanbanColumnProps>(
  (
    {
      className,
      testId,
      status,
      title,
      count,
      meta,
      emptyText = 'Нет задач',
      onAdd,
      addLabel = 'Добавить задачу',
      dropState,
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      aria-label={title}
      data-name={testId ? `UIKanbanColumn-${testId}` : 'UIKanbanColumn'}
      data-drop={dropState ?? undefined}
      className={cn(
        'flex min-h-0 min-w-0 flex-[1_1_0] flex-col gap-2 rounded-block transition-colors duration-150',
        'w640:min-w-[216px] w640:bg-column w640:p-2',
        'data-[drop=ok]:bg-primary-tint-strong data-[drop=bad]:bg-destructive-tint',
        className,
      )}
      {...props}
    >
      <header className='hidden min-h-[28px] flex-none items-center gap-2 px-1 w640:flex'>
        <span
          aria-hidden='true'
          className={cn(
            'size-2 shrink-0 rounded-full',
            STATUS_DOT_CLASS[status],
          )}
        />
        <h2 className='m-0 text-[length:inherit] font-semibold'>{title}</h2>
        {count != null && (
          <span className='text-muted-foreground'>{count}</span>
        )}
        {meta != null && (
          <span className='ml-auto shrink-0 text-caption text-muted-foreground tabular-nums'>
            {meta}
          </span>
        )}
      </header>

      <div className='flex min-h-0 flex-none flex-col gap-2 w640:flex-1 w640:overflow-y-auto w640:scrollbar-thin'>
        {Children.count(children) === 0 ? (
          <div className='px-2 py-4 text-center text-small text-muted-foreground'>
            {emptyText}
          </div>
        ) : (
          children
        )}
        {onAdd && (
          <button
            type='button'
            onClick={onAdd}
            className='flex h-control flex-none cursor-pointer items-center justify-center gap-1 rounded-control font-medium text-muted-foreground transition-colors duration-150 focus-ring hover:bg-border focus-visible:outline-offset-[-2px] [&_svg]:size-icon'
          >
            <UIIcons.Plus />
            {addLabel}
          </button>
        )}
      </div>
    </section>
  ),
);
UIKanbanColumnBase.displayName = 'UIKanbanColumn';
export const UIKanbanColumn = memo(UIKanbanColumnBase);
