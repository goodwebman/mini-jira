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
  return <div className='flex min-h-0 flex-1 flex-col gap-3'>{children}</div>;
}
