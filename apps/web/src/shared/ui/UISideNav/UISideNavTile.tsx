import { type ReactNode, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { type ISlotProps, Slot } from '@/shared/lib/dom';

export interface IUISideNavTileProps extends Omit<
  ISlotProps,
  'as' | 'children'
> {
  readonly testId?: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly value?: ReactNode;
  readonly sub?: ReactNode;
  readonly active?: boolean;
  readonly children?: ReactNode;
}

const UISideNavTileBase = forwardRef<HTMLElement, IUISideNavTileProps>(
  (
    {
      className,
      testId,
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
      className={cn(
        'flex shrink-0 flex-col gap-2 rounded-control px-1 py-2 text-foreground no-underline transition-colors duration-150 focus-ring hover:bg-muted w1280:px-3',
        'data-active:bg-primary-tint data-active:text-primary-hover',
        '[--tile-soft:var(--border)] [--tile-viz:var(--chart-neutral)] data-active:[--tile-soft:var(--primary-tint-strong)] data-active:[--tile-viz:var(--primary)]',
        className,
      )}
      {...props}
    >
      <div className='flex min-h-6 flex-col items-center justify-center gap-x-2 gap-y-1 w1280:flex-row w1280:justify-start'>
        <span className='flex flex-none [&_svg]:size-icon'>{icon}</span>
        <span className='max-w-full text-center text-caption font-medium w1280:text-start w1280:text-body'>
          {label}
        </span>
        {value != null && (
          <span className='hidden w1280:ms-auto w1280:inline text-caption tabular-nums'>
            {value}
          </span>
        )}
      </div>
      {(sub != null || children != null) && (
        <div className='hidden min-w-0 flex-col gap-2 w1280:flex w1280:ps-[calc(var(--icon-md)+var(--space-2))]'>
          {sub != null && (
            <div className='wrap-anywhere text-caption text-muted-foreground'>
              {sub}
            </div>
          )}
          {children != null && (
            <div className='flex min-h-0 flex-col overflow-hidden'>
              {children}
            </div>
          )}
        </div>
      )}
    </Slot>
  ),
);
UISideNavTileBase.displayName = 'UISideNavTile';
export const UISideNavTile = memo(UISideNavTileBase);
