import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { UICard } from '@/shared/ui';

import { type KpiArea, SPANS } from './spans';

/** Карточка графика: заголовок, легенда справа, содержимое. */
export function KpiPanel({
  area,
  title,
  legend,
  children,
  className,
}: {
  readonly area: KpiArea;
  readonly title?: ReactNode;
  readonly legend?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return (
    <UICard
      padding='md'
      className={cn('flex min-w-0 flex-col gap-3', SPANS[area], className)}
    >
      {title != null && (
        <div className='flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1'>
          <UICard.Title as='h2' size='sm'>
            {title}
          </UICard.Title>
          {legend}
        </div>
      )}
      {children}
    </UICard>
  );
}
