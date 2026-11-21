import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import type { TaskPriority } from '@gwmt/contracts';

import { cn } from '@/shared/lib/cn';
import { type RenderElement, Slot } from '@/shared/lib/dom';

import { TaskPriorityMark } from './TaskPriorityMark';

export interface TaskCardLayoutProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> {
  readonly testId?: string;
  /** Ключ задачи: MJ-142. */
  readonly taskKey: string;
  readonly title: string;
  /** Оценка, например «5 SP». */
  readonly points?: ReactNode;
  readonly priority?: TaskPriority;
  /** Адрес задачи. */
  readonly href?: string;
  /** Роутерная ссылка вместо `<a>`. */
  readonly render?: RenderElement;
  /** Строка бейджей: время, запрет, кнопка паузы. Кнопки здесь кликабельны поверх ссылки. */
  readonly badges?: ReactNode;
  /** Низ карточки слева: дата, связи, «Блокер». */
  readonly meta?: ReactNode;
  /** Низ карточки справа: UIAvatar.Group. */
  readonly people?: ReactNode;
  /** Выбранная карточка. */
  readonly selected?: boolean;
}

/**
 * Карточка задачи на доске. Только внешний вид: данные и логика приходят снаружи.
 * Ссылка растянута на всю карточку; `draggable`, `onDragStart` вешаются прямо на неё.
 *
 * @example
 * <TaskCardLayout
 *   taskKey="MJ-143"
 *   title="Панель свойств задачи"
 *   points="5 SP"
 *   priority="high"
 *   render={<Link to="/tasks/143" />}
 *   badges={<UIBadge tone="accent">В работе 1 д 4 ч</UIBadge>}
 *   meta="12 ноя"
 *   people={<UIAvatar.Group><UIAvatar name="Иван Петров" size="xs" /></UIAvatar.Group>}
 * />
 */
const TaskCardLayoutBase = forwardRef<HTMLElement, TaskCardLayoutProps>(
  (
    {
      className,
      testId,
      taskKey,
      title,
      points,
      priority,
      href,
      render,
      badges,
      meta,
      people,
      selected = false,
      ...props
    },
    ref,
  ) => (
    <article
      ref={ref}
      data-name={testId ? `UITaskCard-${testId}` : 'UITaskCard'}
      data-selected={selected || undefined}
      className={cn(
        'relative flex flex-none flex-col gap-2 rounded-card border border-border bg-surface p-3',
        'transition-colors duration-150 hover:border-input',
        // inset: снаружи кольцо обрезал бы скролл колонки
        selected &&
          'border-primary ring-1 ring-inset ring-primary hover:border-primary',
        className,
      )}
      {...props}
    >
      <div className='flex items-center gap-1 text-caption font-medium text-muted-foreground'>
        {priority && <TaskPriorityMark priority={priority} />}
        <span className='min-w-0 truncate'>{taskKey}</span>
        {points != null && (
          <span className='ml-auto shrink-0 tabular-nums'>{points}</span>
        )}
      </div>

      <Slot
        href={href}
        render={render}
        draggable={false}
        aria-label={`Открыть задачу ${taskKey}: ${title}`}
        className='rounded-[2px] font-medium text-foreground no-underline wrap-anywhere focus-ring after:absolute after:inset-0'
      >
        {title}
      </Slot>

      {badges != null && (
        <div className='flex items-center gap-1 [&_a]:relative [&_a]:z-1 [&_button]:relative [&_button]:z-1'>
          {badges}
        </div>
      )}

      {(meta != null || people != null) && (
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground'>
          {meta}
          {people != null && <span className='ml-auto flex'>{people}</span>}
        </div>
      )}
    </article>
  ),
);
TaskCardLayoutBase.displayName = 'UITaskCard';
export const TaskCardLayout = memo(TaskCardLayoutBase);
