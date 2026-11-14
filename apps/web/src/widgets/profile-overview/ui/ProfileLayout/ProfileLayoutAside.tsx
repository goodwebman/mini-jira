import type { ReactNode } from 'react';

/** Сводка по задачам и выход. */
export function ProfileLayoutAside({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return <div className='flex min-w-0 flex-col gap-section'>{children}</div>;
}
