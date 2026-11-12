import {
  type ButtonHTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
} from 'react';

import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';

import { chipVariants } from './UIChip.variants';

export interface IUIChipProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  readonly testId?: string;
  /** Включён ли фильтр. Если не передан, чип — обычная кнопка без `aria-pressed`. */
  readonly pressed?: boolean;
  /** Аватар или иконка слева. */
  readonly avatar?: ReactNode;
}

/**
 * Чип: фильтр по людям и статусам, быстрые действия.
 *
 * @example
 * <UIChip pressed={isOn} onClick={toggle} avatar={<UIAvatar name="Анна" size="xs" />}>Анна</UIChip>
 */
const UIChipBase = forwardRef<HTMLButtonElement, IUIChipProps>(
  (
    {
      className,
      testId,
      variant,
      pressed,
      avatar,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      data-name={testId ? `UIChip-${testId}` : 'UIChip'}
      className={cn(
        chipVariants({ variant }),
        avatar != null && 'pl-[5px]',
        className,
      )}
      {...props}
    >
      {avatar}
      {children}
    </button>
  ),
);
UIChipBase.displayName = 'UIChip';
export const UIChip = memo(UIChipBase);
