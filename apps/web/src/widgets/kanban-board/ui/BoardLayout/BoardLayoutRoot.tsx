import type { ReactNode } from 'react';

/**
 * Раскладка экрана доски. Только сетка и отступы: что лежит в слотах,
 * решает страница. Так разметка не смешивается с данными.
 */
export function BoardLayoutRoot({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div className='flex min-h-0 flex-none flex-col gap-3 w640:flex-1 w640:[@media(height<560px)]:min-h-[360px]'>
      {children}
    </div>
  );
}
