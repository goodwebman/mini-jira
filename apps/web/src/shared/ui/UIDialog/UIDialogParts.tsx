import { type HTMLAttributes, type MouseEvent, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { type IUIButtonProps, UIButton } from '@/shared/ui/UIButton';

import { useDialogContext } from './dialog-context';

export type IUIDialogBodyProps = HTMLAttributes<HTMLDivElement>;

/** Прокручиваемая часть окна. */
const UIDialogBodyBase = forwardRef<HTMLDivElement, IUIDialogBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name='UIDialogBody'
      className={cn(
        'min-h-0 flex-1 overflow-y-auto px-6 py-5 scrollbar-thin',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogBodyBase.displayName = 'UIDialogBody';
export const UIDialogBody = memo(UIDialogBodyBase);

export type IUIDialogFooterProps = HTMLAttributes<HTMLDivElement>;

/** Подвал с действиями, выровненными вправо. */
const UIDialogFooterBase = forwardRef<HTMLDivElement, IUIDialogFooterProps>(
  ({ className, ...props }, ref) => (
    <footer
      ref={ref}
      data-name='UIDialogFooter'
      className={cn(
        'flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogFooterBase.displayName = 'UIDialogFooter';
export const UIDialogFooter = memo(UIDialogFooterBase);

export type IUIDialogCloseProps = IUIButtonProps;

/** Кнопка, закрывающая окно. По умолчанию вторичная. */
const UIDialogCloseBase = forwardRef<HTMLButtonElement, IUIDialogCloseProps>(
  ({ variant = 'secondary', onClick, ...props }, ref) => {
    const { close } = useDialogContext();

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        close();
      }
    };

    return (
      <UIButton ref={ref} variant={variant} onClick={handleClick} {...props} />
    );
  },
);
UIDialogCloseBase.displayName = 'UIDialogClose';
export const UIDialogClose = memo(UIDialogCloseBase);
