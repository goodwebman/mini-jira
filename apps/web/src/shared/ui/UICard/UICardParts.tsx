import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export type IUICardHeaderProps = HTMLAttributes<HTMLDivElement>;

/** Шапка блока: заголовок слева, действие или легенда справа. */
const UICardHeaderBase = forwardRef<HTMLDivElement, IUICardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name="UICardHeader"
      className={cn('flex min-h-[24px] flex-wrap items-center justify-between gap-x-3 gap-y-1', className)}
      {...props}
    />
  ),
);
UICardHeaderBase.displayName = 'UICardHeader';
export const UICardHeader = memo(UICardHeaderBase);

export interface IUICardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** `sm` — заголовок виджета, `md` — заголовок блока формы. */
  readonly size?: 'sm' | 'md';
  /** Уровень заголовка в документе. */
  readonly as?: 'h2' | 'h3' | 'h4';
}

const UICardTitleBase = forwardRef<HTMLHeadingElement, IUICardTitleProps>(
  ({ className, size = 'sm', as: Heading = 'h2', ...props }, ref) => (
    <Heading
      ref={ref}
      data-name="UICardTitle"
      className={cn('m-0 font-semibold', size === 'sm' ? 'text-body' : 'text-title', className)}
      {...props}
    />
  ),
);
UICardTitleBase.displayName = 'UICardTitle';
export const UICardTitle = memo(UICardTitleBase);

export type IUICardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const UICardDescriptionBase = forwardRef<HTMLParagraphElement, IUICardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-name="UICardDescription"
      className={cn('m-0 text-body text-muted-foreground', className)}
      {...props}
    />
  ),
);
UICardDescriptionBase.displayName = 'UICardDescription';
export const UICardDescription = memo(UICardDescriptionBase);

export type IUICardContentProps = HTMLAttributes<HTMLDivElement>;

const UICardContentBase = forwardRef<HTMLDivElement, IUICardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-name="UICardContent" className={cn('flex flex-col gap-3', className)} {...props} />
  ),
);
UICardContentBase.displayName = 'UICardContent';
export const UICardContent = memo(UICardContentBase);

export type IUICardFooterProps = HTMLAttributes<HTMLDivElement>;

const UICardFooterBase = forwardRef<HTMLDivElement, IUICardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-name="UICardFooter" className={cn('flex items-center gap-2', className)} {...props} />
  ),
);
UICardFooterBase.displayName = 'UICardFooter';
export const UICardFooter = memo(UICardFooterBase);
