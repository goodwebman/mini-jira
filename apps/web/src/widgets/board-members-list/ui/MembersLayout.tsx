import type { ReactNode } from 'react';

/** Раскладка участников: список слева, добавление и легенда ролей справа (от 800 px). */
export function MembersLayout({
  members,
  aside,
}: {
  readonly members: ReactNode;
  readonly aside: ReactNode;
}) {
  return (
    <div className='grid grid-cols-1 items-start gap-section md:grid-cols-2'>
      {members}
      <div className='flex min-w-0 flex-col gap-section'>{aside}</div>
    </div>
  );
}
