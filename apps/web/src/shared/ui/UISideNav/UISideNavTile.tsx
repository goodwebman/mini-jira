import { type ReactNode, forwardRef, memo } from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';
import { type ISlotProps, Slot } from '@/shared/lib/dom';

const tileVariants = cva(
  [
    'flex min-h-tile flex-[1_1_0] flex-col gap-3 overflow-hidden rounded-modal px-1 py-3 no-underline lg:p-4',
    'bg-(--tile-tint) text-(--tile-ink) transition-[flex-grow] duration-250 ease-out hover:grow-[1.6] focus-ring',
    '[--tile-icon-bg:var(--surface)] [--tile-icon-fg:var(--tile-ink)]',
    'data-active:grow-[1.6] data-active:bg-(--tile-solid) data-active:text-primary-foreground',
    'data-active:[--tile-viz:var(--surface)] data-active:[--tile-soft:rgb(255_255_255/0.22)]',
    'data-active:[--tile-icon-bg:rgb(255_255_255/0.18)] data-active:[--tile-icon-fg:var(--surface)]',
  ],
  {
    variants: {
      tone: {
        blue: '[--tile-ink:var(--tile-blue-ink)] [--tile-soft:var(--tile-blue-soft)] [--tile-solid:var(--tile-blue-solid)] [--tile-tint:var(--tile-blue-tint)] [--tile-viz:var(--tile-blue-viz)]',
        violet:
          '[--tile-ink:var(--tile-violet-ink)] [--tile-soft:var(--tile-violet-soft)] [--tile-solid:var(--tile-violet-solid)] [--tile-tint:var(--tile-violet-tint)] [--tile-viz:var(--tile-violet-viz)]',
        green:
          '[--tile-ink:var(--tile-green-ink)] [--tile-soft:var(--tile-green-soft)] [--tile-solid:var(--tile-green-solid)] [--tile-tint:var(--tile-green-tint)] [--tile-viz:var(--tile-green-viz)]',
      },
    },
    defaultVariants: { tone: 'blue' },
  },
);

const iconBoxClass =
  'flex size-avatar-lg flex-none items-center justify-center rounded-block bg-(--tile-icon-bg) text-(--tile-icon-fg) [&_svg]:size-icon-lg';

/**
 * Слоты с необязательным содержимым: занимают остаток высоты плитки, а содержимое убирают
 * целиком, когда места мало. Иначе оно срезается по живому. container-type: size нужен
 * для запроса по высоте и заодно не даёт содержимому распирать плитку.
 */
const vizSlotClass =
  'flex min-h-0 flex-1 flex-col [container-type:size] [@container(max-height:28px)]:*:hidden';
const narrowLabelSlotClass =
  'flex min-h-0 w-full flex-1 justify-center [container-type:size] [@container(max-height:48px)]:*:hidden';

export interface IUISideNavTileProps
  extends
    Omit<ISlotProps, 'as' | 'children'>,
    VariantProps<typeof tileVariants> {
  readonly testId?: string;
  readonly icon: ReactNode;
  readonly label: string;
  /** Крупное число справа. */
  readonly value?: ReactNode;
  /** Подпись внизу плитки. */
  readonly sub?: ReactNode;
  /** Текущий раздел: плитка выше и залита цветом. */
  readonly active?: boolean;
  /** Живая визуализация: UISideNav.BoardViz, TasksViz или SparkViz. */
  readonly children?: ReactNode;
}

/** Плитка раздела. Активная в 1,6 раза выше; при наведении растёт любая. */
const UISideNavTileBase = forwardRef<HTMLElement, IUISideNavTileProps>(
  (
    {
      className,
      testId,
      tone,
      icon,
      label,
      value,
      sub,
      active = false,
      children,
      ...props
    },
    ref,
  ) => (
    <Slot
      ref={ref}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-active={active ? '' : undefined}
      data-name={testId ? `UISideNavTile-${testId}` : 'UISideNavTile'}
      className={cn(tileVariants({ tone }), className)}
      {...props}
    >
      {/* Широкое меню */}
      <div className='hidden flex-none items-center gap-3 lg:flex'>
        <span className={iconBoxClass}>{icon}</span>
        <span className='line-clamp-2 min-w-0 flex-1 text-title font-semibold leading-[1.2] tracking-title'>
          {label}
        </span>
        {value != null && (
          <span className='flex-none text-display font-bold leading-none tracking-display tabular-nums'>
            {value}
          </span>
        )}
      </div>
      <div className='hidden min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden lg:flex'>
        {children != null && <div className={vizSlotClass}>{children}</div>}
        {sub != null && (
          <div className='flex-none truncate text-caption opacity-90'>
            {sub}
          </div>
        )}
      </div>

      {/* Узкое меню */}
      <div className='flex min-h-0 flex-1 flex-col items-center justify-between gap-2 lg:hidden'>
        <span className={iconBoxClass}>{icon}</span>
        <span className={narrowLabelSlotClass}>
          <span className='rotate-180 truncate text-left text-lead font-semibold [writing-mode:vertical-rl]'>
            {label}
          </span>
        </span>
        {value != null && (
          <span className='flex-none text-lead font-bold tabular-nums'>
            {value}
          </span>
        )}
      </div>
    </Slot>
  ),
);
UISideNavTileBase.displayName = 'UISideNavTile';
export const UISideNavTile = memo(UISideNavTileBase);
