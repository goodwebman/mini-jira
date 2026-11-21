import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { UIBrand } from '@/shared/ui/UIBrand';

export interface IUISideNavProps extends HTMLAttributes<HTMLElement> {
  readonly testId?: string;
  /** Верх меню; по умолчанию логотип. */
  readonly brand?: ReactNode;
  /** Низ меню, обычно UISideNav.Profile. */
  readonly footer?: ReactNode;
  /** Подпись навигации для скринридера. */
  readonly navLabel?: string;
}

/**
 * Боковое меню с 960 px. От 1280 px показывает сводку.
 *
 * @example
 * <UISideNav footer={<UISideNav.Profile name="Анна Соколова" href="/profile" />}>
 *   <UISideNav.Tile active icon={<UIIcons.Board />} label="Доски" value={8} sub="Спринт 12">
 *     <UISideNav.BoardViz columns={[2, 3, 1, 2]} />
 *   </UISideNav.Tile>
 * </UISideNav>
 */
const UISideNavRootBase = forwardRef<HTMLElement, IUISideNavProps>(
  (
    {
      className,
      testId,
      brand,
      footer,
      navLabel = 'Основная навигация',
      children,
      ...props
    },
    ref,
  ) => (
    <aside
      ref={ref}
      data-name={testId ? `UISideNav-${testId}` : 'UISideNav'}
      className={cn(
        'relative z-40 hidden w-sidebar shrink-0 flex-col gap-4 border-r border-border bg-surface p-2 w960:flex w1280:p-4',
        className,
      )}
      {...props}
    >
      <div className='flex min-h-avatar-md flex-none items-center justify-center gap-2 p-1 w1280:justify-start'>
        {brand ?? <UIBrand nameClassName='hidden w1280:inline' />}
      </div>
      {/* Скролл на случай низкого окна. -m-1 p-1 — запас, чтобы скролл не резал кольцо фокуса */}
      <nav
        aria-label={navLabel}
        className='-m-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scrollbar-thin'
      >
        {children}
      </nav>
      {footer}
    </aside>
  ),
);
UISideNavRootBase.displayName = 'UISideNav';
export const UISideNavRoot = memo(UISideNavRootBase);
