import type { ReactNode } from 'react';

import { UISkeleton } from '@/shared/ui';

import { ShellPage } from './ShellPage';

/** Заглушка на время загрузки страницы: шапка и пара блоков, без прыжков вёрстки. */
export function ShellPageSkeleton({
  label = 'Загрузка',
  title,
  children,
  scroll,
}: {
  readonly label?: string;
  readonly title?: ReactNode;
  readonly children?: ReactNode;
  readonly scroll?: 'auto' | 'fixed';
}) {
  return (
    <ShellPage
      title={title ?? <UISkeleton className='h-[1.2em] w-48 max-w-full' />}
      caption={<UISkeleton className='my-[2px] h-[1em] w-32' />}
      scroll={scroll}
    >
      <div
        aria-busy='true'
        aria-label={label}
        className='flex min-h-0 flex-1 flex-col gap-section'
      >
        {children ?? <UISkeleton className='h-control w-full max-w-md' />}
      </div>
    </ShellPage>
  );
}
