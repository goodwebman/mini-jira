import { cn } from '@/shared/lib/cn';
import { type RenderElement, Slot } from '@/shared/lib/dom';
import { buttonVariants } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** «Участники · 6» в тулбаре доски. */
export function BoardMembersButton({
  count,
  render,
}: {
  readonly count: number;
  readonly render: RenderElement;
}) {
  return (
    <Slot
      render={render}
      aria-label={`Участники · ${String(count)}`}
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'shrink-0 max-w438:px-3',
      )}
    >
      <UIIcons.Users />
      <span className='max-w438:sr-only'>Участники · </span>
      <span className='tabular-nums'>{count}</span>
    </Slot>
  );
}
