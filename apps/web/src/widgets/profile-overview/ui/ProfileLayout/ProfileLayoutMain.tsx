import type { ReactNode } from 'react';

/** Формы. На 1920 карточки становятся отдельными колонками сетки. */
export function ProfileLayoutMain({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div className='flex min-w-0 flex-col gap-section w1920:contents'>
      {children}
    </div>
  );
}
