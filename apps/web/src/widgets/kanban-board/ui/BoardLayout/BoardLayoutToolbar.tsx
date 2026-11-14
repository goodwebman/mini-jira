import type { ReactNode } from 'react';

/** Поиск, приоритет, кнопка участников. */
export function BoardLayoutToolbar({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div className='flex flex-none flex-wrap items-center gap-2'>
      {children}
    </div>
  );
}
