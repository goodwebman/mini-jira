import {
  UITableBody,
  UITableCell,
  UITableHead,
  UITableHeadCell,
  UITableRow,
  UITableRowLink,
} from './UITableParts';
import { UITableRoot } from './UITableRoot';

export const UITable = Object.assign(UITableRoot, {
  Head: UITableHead,
  Body: UITableBody,
  Row: UITableRow,
  HeadCell: UITableHeadCell,
  Cell: UITableCell,
  RowLink: UITableRowLink,
});

export type { IUITableProps } from './UITableRoot';
export type {
  IUITableCellProps,
  IUITableHeadCellProps,
  IUITableRowLinkProps,
  IUITableRowProps,
  IUITableSectionProps,
} from './UITableParts';
