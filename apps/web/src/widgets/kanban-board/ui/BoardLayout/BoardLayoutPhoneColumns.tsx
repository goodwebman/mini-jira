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
      className='-mx-page flex flex-none gap-2 overflow-x-auto px-page py-1 scrollbar-thin w640:hidden'
    >
      {children}
    </div>
  );
}
