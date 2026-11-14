import {
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';

import { type ISlotProps } from '@/shared/lib/dom';

export type IUITableSectionProps = HTMLAttributes<HTMLTableSectionElement>;

export interface IUITableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Выбранная строка. */
  readonly selected?: boolean;
  /** Подсветка при наведении. Включена, если есть `onClick`. */
  readonly interactive?: boolean;
}

export type IUITableHeadCellProps = ThHTMLAttributes<HTMLTableCellElement>;

export type IUITableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export type IUITableRowLinkProps = Omit<ISlotProps, 'as'>;
