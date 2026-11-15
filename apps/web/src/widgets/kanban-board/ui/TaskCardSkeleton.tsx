import { UISkeleton, UITaskCard } from '@/shared/ui';

/** Та же карточка и те же строки: высота следует типографике и токенам проекта. */
export function TaskCardSkeleton() {
  return <UITaskCard aria-hidden='true' className='pointer-events-none' taskKey='…' title=' ' points={<UISkeleton className='h-[1em] w-8' />} badges={<UISkeleton className='h-[1.35em] w-28' />} meta={<UISkeleton className='h-avatar-xs w-20' />} />;
}
