import type { ReactNode } from 'react';

/** Колонки канбана: на узких экранах скроллятся вбок, каждая — вниз. */
export function BoardLayoutColumns({
  children,
  loading = false,
}: {
  readonly children?: ReactNode;
  readonly loading?: boolean;
}) {
  return (
    <div
      aria-busy={loading || undefined}
      aria-label={loading ? 'Загрузка задач' : undefined}
      className='flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden scrollbar-thin'
    >
      {children}
    </div>
  );
}
