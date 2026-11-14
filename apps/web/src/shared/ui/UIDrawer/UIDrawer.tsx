import { forwardRef, memo } from 'react';

import { DrawerPanel } from './DrawerPanel';
import type { IUIDrawerProps } from './types';

/**
 * Выезжающая панель поверх контента, например список досок. Рендерится на месте:
 * родитель должен быть `relative`, тогда сайдбар остаётся над панелью, как в дизайне.
 *
 * @example
 * <div className="relative flex-1">
 *   <UIDrawer open={open} onOpenChange={setOpen} title="Доски задач">…</UIDrawer>
 * </div>
 */
const UIDrawerBase = forwardRef<HTMLElement, IUIDrawerProps>(
  ({ open, onOpenChange, ...props }, ref) => {
    if (!open) {
      return null;
    }
    return (
      <DrawerPanel
        ref={ref}
        onClose={() => {
          onOpenChange(false);
        }}
        {...props}
      />
    );
  },
);
UIDrawerBase.displayName = 'UIDrawer';
export const UIDrawer = memo(UIDrawerBase);
export type { IUIDrawerProps } from './types';
