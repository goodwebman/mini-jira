import { useRef } from 'react';

import { Portal } from '@/shared/lib/dom';
import { useFloatingPosition } from '@/shared/lib/hooks';

import type { TooltipBubbleProps } from './types';

export function TooltipBubble({
  id,
  content,
  anchorRef,
  placement,
  gutter,
}: TooltipBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  useFloatingPosition({
    anchorRef,
    floatingRef: bubbleRef,
    open: true,
    placement,
    gutter,
  });

  return (
    <Portal>
      <div
        ref={bubbleRef}
        id={id}
        role='tooltip'
        data-name='UITooltipContent'
        className='invisible fixed left-0 top-0 z-60 max-w-[320px] rounded-control border border-border bg-surface px-3 py-2 text-body text-foreground shadow-popover'
      >
        {content}
      </div>
    </Portal>
  );
}
