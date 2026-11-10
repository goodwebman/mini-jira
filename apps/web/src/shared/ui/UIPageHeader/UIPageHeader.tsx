import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons } from '@/shared/ui/icons';
import { UIButton, type IUIButtonProps } from '@/shared/ui/UIButton';
import { UIIconButton } from '@/shared/ui/UIIconButton';

export interface IUIPageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly testId?: string;
  readonly title: ReactNode;
  /** Подпись под заголовком. */
  readonly caption?: ReactNode;
  /** Если передан, слева появляется кнопка «Назад». */
  readonly onBack?: () => void;
  readonly backLabel?: string;
  /** Если передан, заголовок становится кнопкой-переключателем с шевроном. */
  readonly onTitleClick?: () => void;
  /** Действия справа. */
  readonly actions?: ReactNode;
}

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
  ({ className, testId, title, caption, onBack, backLabel = 'Назад', onTitleClick, actions, ...props }, ref) => (
    <header
      ref={ref}
      data-name={testId ? `UIPageHeader-${testId}` : 'UIPageHeader'}
      className={cn(
        'flex h-header flex-none items-center gap-2 border-b border-border bg-surface px-page',
        className,
      )}
      {...props}
    >
      {onBack && (
        <UIIconButton label={backLabel} onClick={onBack} className="-ml-[10px]">
          <UIIcons.ArrowLeft />
        </UIIconButton>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="m-0 text-heading font-semibold tracking-title">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-[2px] focus-ring"
            >
              <span className="truncate">{title}</span>
              <UIIcons.ChevronDown className="size-icon-lg" />
            </button>
          ) : (
            <span className="block truncate">{title}</span>
          )}
        </h1>
        {caption != null && (
          <span className="truncate text-caption text-muted-foreground">{caption}</span>
        )}
      </div>
      {actions}
    </header>
  ),
);
UIPageHeaderRootBase.displayName = 'UIPageHeader';
export const UIPageHeaderRoot = memo(UIPageHeaderRootBase);

export interface IUIPageHeaderActionProps extends IUIButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
}

/** Главное действие шапки. На телефоне остаётся только иконка, подпись читает скринридер. */
const UIPageHeaderActionBase = forwardRef<HTMLButtonElement, IUIPageHeaderActionProps>(
  ({ className, icon, label, ...props }, ref) => (
    <UIButton
      ref={ref}
      className={cn('shrink-0 pl-2 pr-3 max-sm:w-control max-sm:px-0', className)}
      {...props}
    >
      {icon}
      <span className="max-sm:sr-only">{label}</span>
    </UIButton>
  ),
);
UIPageHeaderActionBase.displayName = 'UIPageHeaderAction';
export const UIPageHeaderAction = memo(UIPageHeaderActionBase);
