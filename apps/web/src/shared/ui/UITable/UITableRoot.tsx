import { forwardRef, memo, type TableHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface IUITableProps extends TableHTMLAttributes<HTMLTableElement> {
  readonly testId?: string;
  /** Класс внешнего контейнера со скроллом и рамкой. */
  readonly wrapperClassName?: string;
}

/**
 * Таблица в рамке блока. Широкая таблица скроллится внутри контейнера, а не ломает страницу.
 *
 * @example
 * <UITable>
 *   <UITable.Head><UITable.Row><UITable.HeadCell>Ключ</UITable.HeadCell></UITable.Row></UITable.Head>
 *   <UITable.Body>
 *     <UITable.Row interactive>
 *       <UITable.Cell><UITable.RowLink href="/task/1">MJ-142</UITable.RowLink></UITable.Cell>
 *     </UITable.Row>
 *   </UITable.Body>
 * </UITable>
 */
const UITableRootBase = forwardRef<HTMLTableElement, IUITableProps>(
  ({ className, wrapperClassName, testId, ...props }, ref) => (
    <div
      className={cn(
        // flex-none: с overflow блок иначе схлопнется в нулевую высоту внутри flex-колонки
        'flex-none overflow-x-auto rounded-block border border-border bg-surface scrollbar-thin',
        wrapperClassName,
      )}
    >
      <table
        ref={ref}
        data-name={testId ? `UITable-${testId}` : 'UITable'}
        className={cn('w-full border-collapse', className)}
        {...props}
      />
    </div>
  ),
);
UITableRootBase.displayName = 'UITable';
export const UITableRoot = memo(UITableRootBase);
