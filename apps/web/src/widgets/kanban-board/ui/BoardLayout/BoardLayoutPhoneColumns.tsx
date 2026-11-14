import type { ReactNode } from 'react';

/** Выбор колонки на телефоне: там видна одна колонка. */
export function BoardLayoutPhoneColumns({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div
      role='group'
      aria-label='Колонка'
      className='-mx-page flex flex-none gap-2 overflow-x-auto px-page [scrollbar-width:none] sm:hidden'
    >
      {children}
    </div>
  );
}
