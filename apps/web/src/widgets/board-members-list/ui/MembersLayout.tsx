import type { ReactNode } from 'react';

/** От 1280 px список слева, добавление и легенда ролей справа. */
export function MembersLayout({
  members,
  aside,
}: {
  readonly members: ReactNode;
  readonly aside: ReactNode;
}) {
  return (
    <div className='grid grid-cols-1 items-start gap-section w1280:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
      {members}
      <div className='flex min-w-0 flex-col gap-section'>{aside}</div>
    </div>
  );
}
