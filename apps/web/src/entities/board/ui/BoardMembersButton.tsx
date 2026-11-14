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
      className={cn(buttonVariants({ variant: 'secondary' }), 'shrink-0')}
    >
      <UIIcons.Users />
      Участники · {count}
    </Slot>
  );
}
