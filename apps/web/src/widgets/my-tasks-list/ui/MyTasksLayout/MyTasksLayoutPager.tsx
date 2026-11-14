import type { ReactNode } from 'react';

export function MyTasksLayoutPager({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <nav
      aria-label='Страницы'
      className='flex items-center justify-center gap-3'
    >
      {children}
    </nav>
  );
}
