import { forwardRef, memo } from 'react';
import { cn } from '@/shared/lib/cn';
import { Slot, type ISlotProps } from '@/shared/lib/dom';

export interface IUILinkProps extends Omit<ISlotProps, 'as'> {
  readonly testId?: string;
}

/**
 * Текстовая ссылка в акцентном цвете. Для роутерных переходов передай `render`.
 *
 * @example
 * <UILink href="/forgot">Забыли пароль?</UILink>
 * <UILink render={<Link to="/tasks" />}>Все задачи</UILink>
 */
const UILinkBase = forwardRef<HTMLElement, IUILinkProps>(({ className, testId, ...props }, ref) => (
  <Slot
    ref={ref}
    data-name={testId ? `UILink-${testId}` : 'UILink'}
    className={cn(
      'rounded-[2px] font-medium text-primary-hover no-underline hover:underline focus-ring',
      className,
    )}
    {...props}
  />
));
UILinkBase.displayName = 'UILink';
export const UILink = memo(UILinkBase);
