import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';

import { badgeVariants } from './UIBadge.variants';

export interface IUIBadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  readonly testId?: string;
  /** Иконка слева от текста. */
  readonly icon?: ReactNode;
}

/**
 * Бейдж-пилюля: время на карточке, роль, запрет. Длинный текст обрезается многоточием.
 *
 * @example
 * <UIBadge tone="accent">Администратор</UIBadge>
 * <UIBadge tone="warning" icon={<UIIcons.Pause />}>На паузе 6 ч</UIBadge>
 */
const UIBadgeBase = forwardRef<HTMLSpanElement, IUIBadgeProps>(
  ({ className, testId, tone, icon, children, ...props }, ref) => (
    <span
      ref={ref}
      data-name={testId ? `UIBadge-${testId}` : 'UIBadge'}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {icon}
      <span className='truncate'>{children}</span>
    </span>
  ),
);
UIBadgeBase.displayName = 'UIBadge';
export const UIBadge = memo(UIBadgeBase);
