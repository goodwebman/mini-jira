import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { type ISlotProps, Slot } from '@/shared/lib/dom';
import { UIAvatar } from '@/shared/ui/UIAvatar';

export interface IUISideNavProfileProps extends Omit<
  ISlotProps,
  'as' | 'children'
> {
  readonly testId?: string;
  readonly name: string;
  /** Фото пользователя. */
  readonly avatarSrc?: null | string;
  /** Вторая строка. */
  readonly caption?: string;
  readonly active?: boolean;
}

/** Ссылка на профиль внизу меню. */
const UISideNavProfileBase = forwardRef<HTMLElement, IUISideNavProfileProps>(
  (
    {
      className,
      testId,
      name,
      avatarSrc,
      caption = 'Профиль',
      active = false,
      ...props
    },
    ref,
  ) => (
    <Slot
      ref={ref}
      aria-label={caption}
      aria-current={active ? 'page' : undefined}
      data-name={testId ? `UISideNavProfile-${testId}` : 'UISideNavProfile'}
      className={cn(
        'flex min-h-12 flex-none flex-col items-center justify-center gap-1 rounded-control p-2 text-foreground no-underline w1280:flex-row w1280:gap-2',
        'transition-colors duration-150 focus-ring hover:bg-muted w1280:justify-start',
        'aria-[current=page]:bg-primary-tint aria-[current=page]:text-primary-hover',
        className,
      )}
      {...props}
    >
      <UIAvatar name={name} src={avatarSrc} size='md' />
      <span className='flex min-w-0 flex-col'>
        <span className='hidden truncate font-medium w1280:inline'>{name}</span>
        <span className='text-caption text-muted-foreground'>{caption}</span>
      </span>
    </Slot>
  ),
);
UISideNavProfileBase.displayName = 'UISideNavProfile';
export const UISideNavProfile = memo(UISideNavProfileBase);
