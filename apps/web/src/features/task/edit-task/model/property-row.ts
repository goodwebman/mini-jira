import type { ReactNode } from 'react';

/** Строка «подпись — поле»: фича отдаёт строки, раскладку задаёт страница. */
export interface TaskPropertyRow {
  readonly id: string;
  readonly label: string;
  readonly control: ReactNode;
}
