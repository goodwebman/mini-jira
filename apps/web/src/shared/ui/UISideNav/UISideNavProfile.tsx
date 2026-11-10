import { forwardRef, memo } from 'react';
import { cn } from '@/shared/lib/cn';
import { Slot, type ISlotProps } from '@/shared/lib/dom';
import { UIAvatar } from '@/shared/ui/UIAvatar';

export interface IUISideNavProfileProps extends Omit<ISlotProps, 'as' | 'children'> {
  readonly testId?: string;
  readonly name: string;
  /** Фото пользователя. */
  readonly avatarSrc?: string | null;
  /** Вторая строка. */
  readonly caption?: string;
  readonly active?: boolean;
}

/** Ссылка на профиль внизу меню. В узком меню остаётся только аватар. */
const UISideNavProfileBase = forwardRef<HTMLElement, IUISideNavProfileProps>(
  ({ className, testId, name, avatarSrc, caption = 'Профиль', active = false, ...props }, ref) => (
    <Slot
      ref={ref}
      aria-label={caption}
      aria-current={active ? 'page' : undefined}
      data-name={testId ? `UISideNavProfile-${testId}` : 'UISideNavProfile'}
      className={cn(
        'flex min-h-[48px] flex-none items-center justify-center gap-2 rounded-block px-2 py-1 text-foreground no-underline',
        'transition-colors duration-150 focus-ring hover:bg-muted lg:justify-start',
        'aria-[current=page]:bg-primary-tint aria-[current=page]:text-primary-hover',
        className,
      )}
      {...props}
    >
      <UIAvatar name={name} src={avatarSrc} size="md" />
      <span className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate font-medium">{name}</span>
        <span className="text-caption text-muted-foreground">{caption}</span>
      </span>
    </Slot>
  ),
);
UISideNavProfileBase.displayName = 'UISideNavProfile';
export const UISideNavProfile = memo(UISideNavProfileBase);
