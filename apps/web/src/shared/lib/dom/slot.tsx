import {
  cloneElement,
  forwardRef,
  isValidElement,
  type AnchorHTMLAttributes,
  type ElementType,
  type ReactElement,
} from 'react';
import { cn } from '../cn';

/** Элемент, в который кит подставит свои классы и контент, например `<Link to="/boards" />`. */
export type RenderElement = ReactElement<{ className?: string }>;

export interface ISlotProps extends AnchorHTMLAttributes<HTMLElement> {
  /** Заменяет тег: роутерная ссылка получает стили и контент компонента кита. */
  readonly render?: RenderElement;
  /** Тег по умолчанию, если `render` не передан. */
  readonly as?: ElementType;
  /** Прочие data-атрибуты пробрасываются как есть. */
  readonly [key: `data-${string}`]: unknown;
}

/**
 * Узел с подменяемым тегом. Так компоненты кита работают с любым роутером, не завися от него:
 * свойства самого `render` важнее пропсов кита, `className` склеивается.
 *
 * @example
 * <Slot className="text-primary" render={<Link to="/boards" />}>Доски</Slot>
 */
export const Slot = forwardRef<HTMLElement, ISlotProps>(
  ({ render, as: Tag = 'a', className, ...props }, ref) => {
    if (isValidElement(render)) {
      return cloneElement(render, {
        ...props,
        ...render.props,
        ref,
        className: cn(className, render.props.className),
      } as Partial<RenderElement['props']>);
    }
    return <Tag ref={ref} className={className} {...props} />;
  },
);
Slot.displayName = 'Slot';
