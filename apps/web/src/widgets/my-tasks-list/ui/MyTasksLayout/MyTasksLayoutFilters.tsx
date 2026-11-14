import type { ReactNode } from 'react';

export function MyTasksLayoutFilters({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div
      role='search'
      className='flex flex-none flex-wrap items-center gap-x-3 gap-y-2'
    >
      {children}
    </div>
  );
}
