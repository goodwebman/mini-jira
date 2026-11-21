import type { ReactNode } from 'react';

/** Фильтр по людям: чипы прокручиваются вбок и уходят под край экрана. */
export function BoardLayoutPeople({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div
      role='group'
      aria-label='Фильтр по участникам'
      className='-mx-page flex flex-none gap-2 overflow-x-auto px-page py-1 scrollbar-thin'
    >
      {children}
    </div>
  );
}
