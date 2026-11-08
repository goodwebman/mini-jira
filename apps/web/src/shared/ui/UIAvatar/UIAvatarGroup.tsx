import { Children, forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { avatarVariants } from './UIAvatar.variants';

export interface IUIAvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
  /** Сколько аватаров показать; остальные свернутся в «+N». */
  readonly max?: number;
  /** Размер счётчика «+N»: должен совпадать с размером аватаров. */
  readonly size?: 'xs' | 'sm';
}

const OVERLAP: Record<NonNullable<IUIAvatarGroupProps['size']>, string> = {
  xs: '[&>*+*]:-ml-[6px]',
  sm: '[&>*+*]:-ml-[8px]',
};

/**
 * Стопка аватаров с нахлёстом и белой обводкой.
 *
 * @example
 * <UIAvatar.Group max={3}>{people.map((p) => <UIAvatar key={p.id} name={p.name} size="xs" />)}</UIAvatar.Group>
 */
const UIAvatarGroupBase = forwardRef<HTMLDivElement, IUIAvatarGroupProps>(
  ({ className, testId, max, size = 'xs', children, ...props }, ref) => {
    const items = Children.toArray(children);
    const visible = max != null ? items.slice(0, max) : items;
    const hidden = items.length - visible.length;

    return (
      <div
        ref={ref}
        data-name={testId ? `UIAvatarGroup-${testId}` : 'UIAvatarGroup'}
        className={cn('flex items-center [&>*]:border-2 [&>*]:border-surface', OVERLAP[size], className)}
        {...props}
      >
        {visible}
        {hidden > 0 && (
          <span
            title={`Ещё ${String(hidden)}`}
            className={avatarVariants({ size, tint: 'gray' })}
          >
            +{hidden}
          </span>
        )}
      </div>
    );
  },
);
UIAvatarGroupBase.displayName = 'UIAvatarGroup';
export const UIAvatarGroup = memo(UIAvatarGroupBase);
