import { useMemo, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { Portal } from '@/shared/lib/dom';
import {
  useEscape,
  useFloatingPosition,
  useFocusTrap,
  useOutsideClick,
} from '@/shared/lib/hooks';

import type { PopoverPanelProps } from './types';

export function PopoverPanel({
  id,
  anchorRef,
  placement,
  gutter,
  className,
  ariaLabel,
  onClose,
  children,
}: PopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const ignoreRefs = useMemo(() => [anchorRef], [anchorRef]);

  useFloatingPosition({
    anchorRef,
    floatingRef: panelRef,
    open: true,
    placement,
    gutter,
  });
  useFocusTrap(panelRef, true);
  useEscape(onClose);
  useOutsideClick(panelRef, onClose, { ignoreRefs });

  return (
    <Portal>
      <div
        ref={panelRef}
        id={id}
        role='dialog'
        aria-label={ariaLabel}
        tabIndex={-1}
        data-name='UIPopoverContent'
        className={cn(
          'invisible fixed left-0 top-0 z-60 min-w-[192px] rounded-block border border-border bg-surface p-4 text-foreground shadow-popover outline-none',
          className,
        )}
      >
        {children}
      </div>
    </Portal>
  );
}
