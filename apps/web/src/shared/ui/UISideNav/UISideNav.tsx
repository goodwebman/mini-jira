import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { UIBrand } from '../UIBrand';

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
 * Боковое меню-плитки. Ширина и режим зависят от экрана сами: от 1280 — плитки с данными,
 * 800–1279 — узкие плитки, меньше 800 — скрыто (тогда работают UITabBar и UIBottomNav).
 *
 * @example
 * <UISideNav footer={<UISideNav.Profile name="Анна Соколова" href="/profile" />}>
 *   <UISideNav.Tile tone="blue" active icon={<UIIcons.Board />} label="Доски" value={8} sub="Спринт 12">
 *     <UISideNav.BoardViz columns={[2, 3, 1, 2]} />
 *   </UISideNav.Tile>
 * </UISideNav>
 */
const UISideNavRootBase = forwardRef<HTMLElement, IUISideNavProps>(
  ({ className, testId, brand, footer, navLabel = 'Основная навигация', children, ...props }, ref) => (
    <aside
      ref={ref}
      data-name={testId ? `UISideNav-${testId}` : 'UISideNav'}
      className={cn(
        'relative z-40 hidden w-sidebar shrink-0 flex-col gap-3 border-r border-border bg-surface p-3 md:flex',
        className,
      )}
      {...props}
    >
      <div className="flex min-h-avatar-md flex-none items-center justify-center gap-2 p-1 lg:justify-start">
        {brand ?? <UIBrand nameClassName="hidden lg:inline" />}
      </div>
      {/* Скролл на случай низкого окна. -m-1 p-1 — запас, чтобы скролл не резал кольцо фокуса */}
      <nav
        aria-label={navLabel}
        className="-m-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scrollbar-thin"
      >
        {children}
      </nav>
      {footer}
    </aside>
  ),
);
UISideNavRootBase.displayName = 'UISideNav';
export const UISideNavRoot = memo(UISideNavRootBase);
