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
      className='flex min-h-0 flex-none gap-3 w640:flex-1 w640:overflow-x-auto w640:overflow-y-hidden w640:scrollbar-thin'
    >
      {children}
    </div>
  );
}
