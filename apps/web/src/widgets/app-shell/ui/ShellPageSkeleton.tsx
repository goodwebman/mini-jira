import type { ReactNode } from 'react';

import { UISkeleton } from '@/shared/ui';

import { ShellPage } from './ShellPage';

/** Заглушка на время загрузки страницы: шапка и пара блоков, без прыжков вёрстки. */
export function ShellPageSkeleton({
  label = 'Загрузка',
  title,
  children,
  scroll,
  actions,
}: {
  readonly label?: string;
  readonly title?: ReactNode;
  readonly children?: ReactNode;
  readonly scroll?: 'auto' | 'fixed';
  readonly actions?: ReactNode;
}) {
  return (
    <ShellPage
      title={title ?? <UISkeleton className='h-[1.3em] w-48 max-w-full' />}
      caption={<UISkeleton className='h-[1.33em] w-32' />}
      scroll={scroll}
      actions={actions}
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
