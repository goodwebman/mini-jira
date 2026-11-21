import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { type RenderElement, Slot } from '@/shared/lib/dom';

export interface IUIListItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  readonly testId?: string;
  /** Аватар или иконка слева. */
  readonly media?: ReactNode;
  readonly title: ReactNode;
  /** Вторая строка мелким текстом. */
  readonly description?: ReactNode;
  /** Контент справа. Лежит вне ссылки, поэтому кнопки здесь не конфликтуют с переходом. */
  readonly actions?: ReactNode;
  /** Сделать строку ссылкой. */
  readonly href?: string;
  /** Роутерная ссылка вместо `<a>`. */
  readonly render?: RenderElement;
  /** Линия над строкой. Для списка в блоке с отступами поставь `false`. */
  readonly divided?: boolean;
}

/**
 * Строка списка: участник, кандидат, доска.
 *
 * @example
 * <UIListItem
 *   media={<UIAvatar name={user.name} size="lg" />}
 *   title={user.name}
 *   description={user.email}
 *   actions={<UIButton variant="secondary">Добавить</UIButton>}
 * />
 */
const UIListItemBase = forwardRef<HTMLDivElement, IUIListItemProps>(
  (
    {
      className,
      testId,
      media,
      title,
      description,
      actions,
      href,
      render,
      divided = true,
      ...props
    },
    ref,
  ) => {
    const interactive = href != null || render != null;

    const content = (
      <>
        {media}
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='font-medium wrap-anywhere'>{title}</span>
          {description != null && (
            <span className='text-caption wrap-anywhere text-muted-foreground'>
              {description}
            </span>
          )}
        </span>
      </>
    );
    const contentClass =
      'flex min-w-0 flex-[1_1_192px] items-center gap-3 text-foreground no-underline';

    return (
      <div
        ref={ref}
        data-name={testId ? `UIListItem-${testId}` : 'UIListItem'}
        className={cn(
          'flex min-h-[calc(var(--avatar-lg)+24px)] flex-wrap items-center gap-x-3 gap-y-2 py-2',
          divided ? 'border-t border-border' : 'rounded-card',
          // Подсветка отдельным слоем: выступает за края, а контент остаётся на линии с разделителями
          interactive && [
            "relative isolate before:absolute before:-inset-x-2 before:inset-y-1 before:-z-1 before:rounded-card before:content-['']",
            'before:transition-colors before:duration-150 hover:before:bg-muted',
          ],
          className,
        )}
        {...props}
      >
        {interactive ? (
          <Slot
            href={href}
            render={render}
            className={cn(contentClass, 'rounded-card focus-ring')}
          >
            {content}
          </Slot>
        ) : (
          <div className={contentClass}>{content}</div>
        )}
        {actions != null && (
          <div className='ms-auto flex max-w-full flex-wrap items-center justify-end gap-1'>
            {actions}
          </div>
        )}
      </div>
    );
  },
);
UIListItemBase.displayName = 'UIListItem';
export const UIListItem = memo(UIListItemBase);
