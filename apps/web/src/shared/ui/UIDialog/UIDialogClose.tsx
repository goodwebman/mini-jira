import { type MouseEvent, forwardRef, memo } from 'react';

import { UIButton } from '@/shared/ui/UIButton';

import { useDialogContext } from './dialog-context';
import type { IUIDialogCloseProps } from './types';

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
