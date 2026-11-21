import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { UIIconButton } from '@/shared/ui/UIIconButton';
import { UIIcons } from '@/shared/ui/icons';

import type { IUIPageHeaderProps } from './types';

/**
 * Шапка страницы.
 *
 * @example
 * <UIPageHeader
 *   title="Разработка"
 *   caption="Спринт 12"
 *   onTitleClick={openBoards}
 *   actions={<UIPageHeader.Action icon={<UIIcons.Plus />} label="Задача" onClick={create} />}
 * />
 */
const UIPageHeaderRootBase = forwardRef<HTMLElement, IUIPageHeaderProps>(
  (
    {
      className,
      testId,
      title,
      caption,
      onBack,
      backDisabled,
      backLabel = 'Назад',
      onTitleClick,
      actions,
      ...props
    },
    ref,
  ) => (
    <header
      ref={ref}
      data-name={testId ? `UIPageHeader-${testId}` : 'UIPageHeader'}
      className={cn(
        'flex min-h-header flex-none items-center gap-2 border-b border-border bg-surface px-page py-2',
        className,
      )}
      {...props}
    >
      {(onBack || backDisabled) && (
        <UIIconButton
          label={backLabel}
          onClick={onBack}
          disabled={backDisabled}
          className='-ms-2'
        >
          <UIIcons.ArrowLeft />
        </UIIconButton>
      )}
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h1 className='m-0 text-heading font-semibold'>
          {onTitleClick ? (
            <button
              type='button'
              onClick={onTitleClick}
              aria-haspopup='dialog'
              className='flex max-w-full cursor-pointer items-center gap-1 rounded-control text-start focus-ring'
            >
              <span className='line-clamp-2 min-w-0 wrap-anywhere'>
                {title}
              </span>
              <UIIcons.ChevronDown className='size-icon shrink-0' />
            </button>
          ) : (
            <span className='line-clamp-2 wrap-anywhere'>{title}</span>
          )}
        </h1>
        {caption != null && (
          <span className='truncate text-caption text-muted-foreground'>
            {caption}
          </span>
        )}
      </div>
      {actions}
    </header>
  ),
);
UIPageHeaderRootBase.displayName = 'UIPageHeader';
export const UIPageHeaderRoot = memo(UIPageHeaderRootBase);
