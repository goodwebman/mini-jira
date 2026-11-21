import { forwardRef, useId, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useEscape, useFocusTrap, useMergedRefs } from '@/shared/lib/hooks';
import { UIIconButton } from '@/shared/ui/UIIconButton';
import { UIIcons } from '@/shared/ui/icons';

import type { DrawerPanelProps } from './types';

export const DrawerPanel = forwardRef<HTMLElement, DrawerPanelProps>(
  ({ className, testId, title, actions, onClose, children, ...props }, ref) => {
    const panelRef = useRef<HTMLElement>(null);
    const mergedRef = useMergedRefs(panelRef, ref);
    const titleId = useId();

    useEscape(onClose);
    useFocusTrap(panelRef, true);

    return (
      <>
        <div
          aria-hidden='true'
          data-name='UIDrawerOverlay'
          className='absolute inset-0 z-30 animate-fade-in bg-overlay-soft'
          onClick={onClose}
        />
        <section
          ref={mergedRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby={titleId}
          tabIndex={-1}
          data-name={testId ? `UIDrawer-${testId}` : 'UIDrawer'}
          className={cn(
            'absolute inset-y-0 left-0 z-31 flex w-[min(600px,100%)] flex-col gap-3 overflow-y-auto',
            'bg-surface p-4 shadow-drawer outline-none scrollbar-thin w640:p-5 w1920:w-[min(720px,100%)]',
            className,
          )}
          {...props}
        >
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'>
            <h2
              id={titleId}
              className='m-0 text-title font-semibold wrap-anywhere'
            >
              {title}
            </h2>
            <UIIconButton
              label='Закрыть панель'
              onClick={onClose}
              className='justify-self-end'
              data-focus-skip=''
            >
              <UIIcons.X />
            </UIIconButton>
            {actions != null && (
              <div className='col-span-full flex flex-wrap items-center gap-2'>
                {actions}
              </div>
            )}
          </div>
          {children}
        </section>
      </>
    );
  },
);
DrawerPanel.displayName = 'UIDrawerPanel';
