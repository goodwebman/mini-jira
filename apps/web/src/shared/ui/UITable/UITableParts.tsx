import {
  forwardRef,
  memo,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { Slot, type ISlotProps } from '@/shared/lib/dom';

export type IUITableSectionProps = HTMLAttributes<HTMLTableSectionElement>;

const UITableHeadBase = forwardRef<HTMLTableSectionElement, IUITableSectionProps>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} data-name="UITableHead" className={cn('border-b border-border', className)} {...props} />
  ),
);
UITableHeadBase.displayName = 'UITableHead';
export const UITableHead = memo(UITableHeadBase);

const UITableBodyBase = forwardRef<HTMLTableSectionElement, IUITableSectionProps>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} data-name="UITableBody" className={className} {...props} />
  ),
);
UITableBodyBase.displayName = 'UITableBody';
export const UITableBody = memo(UITableBodyBase);

export interface IUITableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Выбранная строка. */
  readonly selected?: boolean;
  /** Подсветка при наведении. Включена, если есть `onClick`. */
  readonly interactive?: boolean;
}

const UITableRowBase = forwardRef<HTMLTableRowElement, IUITableRowProps>(
  ({ className, selected = false, interactive, onClick, ...props }, ref) => (
    <tr
      ref={ref}
      data-name="UITableRow"
      data-selected={selected || undefined}
      onClick={onClick}
      className={cn(
        'relative border-b border-border last:border-b-0',
        (interactive ?? onClick != null) && 'cursor-pointer transition-colors duration-150 hover:bg-background',
        selected && 'bg-primary-tint hover:bg-primary-tint',
        className,
      )}
      {...props}
    />
  ),
);
UITableRowBase.displayName = 'UITableRow';
export const UITableRow = memo(UITableRowBase);

export type IUITableHeadCellProps = ThHTMLAttributes<HTMLTableCellElement>;

const UITableHeadCellBase = forwardRef<HTMLTableCellElement, IUITableHeadCellProps>(
  ({ className, scope = 'col', ...props }, ref) => (
    <th
      ref={ref}
      scope={scope}
      data-name="UITableHeadCell"
      className={cn(
        'h-control whitespace-nowrap px-2 text-left text-caption font-semibold text-muted-foreground first:pl-3 last:pr-3',
        className,
      )}
      {...props}
    />
  ),
);
UITableHeadCellBase.displayName = 'UITableHeadCell';
export const UITableHeadCell = memo(UITableHeadCellBase);

export type IUITableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

const UITableCellBase = forwardRef<HTMLTableCellElement, IUITableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      data-name="UITableCell"
      className={cn('h-table-row px-2 text-body first:pl-3 last:pr-3', className)}
      {...props}
    />
  ),
);
UITableCellBase.displayName = 'UITableCell';
export const UITableCell = memo(UITableCellBase);

export type IUITableRowLinkProps = Omit<ISlotProps, 'as'>;

/**
 * Ссылка на всю строку: клик где угодно по строке ведёт по ней, а Tab и средняя
 * кнопка мыши работают как у обычной ссылки. Кладётся в одну из ячеек.
 */
const UITableRowLinkBase = forwardRef<HTMLElement, IUITableRowLinkProps>(
  ({ className, ...props }, ref) => (
    <Slot
      ref={ref}
      data-name="UITableRowLink"
      className={cn(
        'rounded-[2px] font-medium text-foreground no-underline focus-ring after:absolute after:inset-0',
        className,
      )}
      {...props}
    />
  ),
);
UITableRowLinkBase.displayName = 'UITableRowLink';
export const UITableRowLink = memo(UITableRowLinkBase);
