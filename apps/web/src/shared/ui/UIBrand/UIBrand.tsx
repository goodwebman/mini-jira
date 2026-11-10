import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons } from '@/shared/ui/icons';
import { UIIconTile } from '@/shared/ui/UIIconTile';

export interface IUIBrandProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
  /** Название продукта. */
  readonly name?: string;
  /** Класс подписи, например `hidden lg:inline`, чтобы прятать её в узком меню. */
  readonly nameClassName?: string;
}

/** Логотип продукта: значок и название. */
const UIBrandBase = forwardRef<HTMLDivElement, IUIBrandProps>(
  ({ className, testId, name = 'goodWebManTasks', nameClassName, ...props }, ref) => (
    <div
      ref={ref}
      data-name={testId ? `UIBrand-${testId}` : 'UIBrand'}
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <UIIconTile size="md" tint="primary">
        <UIIcons.Board />
      </UIIconTile>
      <span className={cn('whitespace-nowrap text-lead font-semibold', nameClassName)}>{name}</span>
    </div>
  ),
);
UIBrandBase.displayName = 'UIBrand';
export const UIBrand = memo(UIBrandBase);
