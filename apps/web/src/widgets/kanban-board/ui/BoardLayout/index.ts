import { BoardLayoutColumns } from './BoardLayoutColumns';
import { BoardLayoutPeople } from './BoardLayoutPeople';
import { BoardLayoutPhoneColumns } from './BoardLayoutPhoneColumns';
import { BoardLayoutRoot } from './BoardLayoutRoot';
import { BoardLayoutToolbar } from './BoardLayoutToolbar';

/** Раскладка доски со слотами: `<BoardLayout.Toolbar>`, `.People`, `.PhoneColumns`, `.Columns`. */
export const BoardLayout = Object.assign(BoardLayoutRoot, {
  Toolbar: BoardLayoutToolbar,
  People: BoardLayoutPeople,
  PhoneColumns: BoardLayoutPhoneColumns,
  Columns: BoardLayoutColumns,
});
