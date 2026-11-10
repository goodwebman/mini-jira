import { forwardRef, memo, Children, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons } from '@/shared/ui/icons';
import { STATUS_DOT_CLASS, type UITaskStatus } from '@/shared/ui/UIStatusBadge/status.styles';

export interface IUIKanbanColumnProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly testId?: string;
  readonly status: UITaskStatus;
  /** Название колонки; оно же её доступное имя. */
  readonly title: string;
  readonly count?: number;
  /** Подпись справа в шапке, например «12 SP». */
  readonly meta?: ReactNode;
  /** Текст пустой колонки. */
  readonly emptyText?: string;
  /** Если передан, снизу появляется кнопка добавления. */
  readonly onAdd?: () => void;
  readonly addLabel?: string;
  /** Подсветка при перетаскивании: `ok` — можно бросить, `bad` — нельзя. */
  readonly dropState?: 'ok' | 'bad' | null;
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
    { className, testId, status, title, count, meta, emptyText = 'Нет задач', onAdd, addLabel = 'Добавить задачу', dropState, children, ...props },
    ref,
  ) => (
    <section
      ref={ref}
      aria-label={title}
      data-name={testId ? `UIKanbanColumn-${testId}` : 'UIKanbanColumn'}
      data-drop={dropState ?? undefined}
      className={cn(
        'flex min-h-0 min-w-0 flex-[1_1_0] flex-col gap-2 rounded-block transition-colors duration-150',
        'sm:bg-column sm:p-2 sm:max-md:min-w-[260px] md:max-lg:min-w-[240px]',
        'data-[drop=ok]:bg-primary-tint-strong data-[drop=bad]:bg-destructive-tint',
        className,
      )}
      {...props}
    >
      <header className="hidden min-h-[28px] flex-none items-center gap-2 px-1 sm:flex">
        <span aria-hidden="true" className={cn('size-[8px] rounded-full', STATUS_DOT_CLASS[status])} />
        <h2 className="m-0 text-[length:inherit] font-semibold">{title}</h2>
        {count != null && <span className="text-muted-foreground">{count}</span>}
        {meta != null && <span className="ml-auto text-caption text-muted-foreground">{meta}</span>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin">
        {Children.count(children) === 0 ? (
          <div className="px-2 py-4 text-center text-small text-muted-foreground">{emptyText}</div>
        ) : (
          children
        )}
      </div>

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-control flex-none cursor-pointer items-center justify-center gap-1 rounded-control font-medium text-muted-foreground transition-colors duration-150 focus-ring hover:bg-border [&_svg]:size-icon"
        >
          <UIIcons.Plus />
          {addLabel}
        </button>
      )}
    </section>
  ),
);
UIKanbanColumnBase.displayName = 'UIKanbanColumn';
export const UIKanbanColumn = memo(UIKanbanColumnBase);
