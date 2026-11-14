import type { ReactNode } from 'react';

/**
 * Раскладка профиля по макетам: на 1920 — три колонки (две формы и сводка),
 * на 1440 и 960 — формы слева, сводка справа, на телефоне — одна колонка.
 */
export function ProfileLayoutRoot({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <div className='grid grid-cols-1 items-start gap-section md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]'>
      {children}
    </div>
  );
}
