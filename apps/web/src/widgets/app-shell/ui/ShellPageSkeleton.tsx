import { UISkeleton } from '@/shared/ui';

/** Заглушка на время загрузки страницы: шапка и пара блоков, без прыжков вёрстки. */
export function ShellPageSkeleton({
  label = 'Загрузка',
}: {
  readonly label?: string;
}) {
  return (
    <div
      aria-busy='true'
      aria-label={label}
      className='flex min-h-0 flex-1 flex-col'
    >
      <div className='flex h-header flex-none items-center gap-3 border-b border-border bg-surface px-page'>
        <UISkeleton className='h-6 w-48' />
      </div>
      <div className='flex flex-1 flex-col gap-section p-page'>
        <UISkeleton className='h-control w-full max-w-md' />
        <UISkeleton className='min-h-40 flex-1' />
      </div>
    </div>
  );
}
