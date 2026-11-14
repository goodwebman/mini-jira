import type { ReactNode } from 'react';

/** Раскладка «Моих задач»: фильтры, список, страницы. Только сетка, без данных. */
export function MyTasksLayoutRoot({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return <div className='flex flex-col gap-section'>{children}</div>;
}
