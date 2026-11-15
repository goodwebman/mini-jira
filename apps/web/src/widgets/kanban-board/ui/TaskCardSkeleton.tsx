import { UIBadge, UISkeleton, UITaskCard } from '@/shared/ui';

/** Та же карточка и те же строки: высота следует типографике и токенам проекта. */
export function TaskCardSkeleton() {
  return (
    <UITaskCard
      aria-hidden='true'
      className='pointer-events-none [&_a]:rounded-control [&_a]:bg-muted [&_a]:text-transparent'
      taskKey='…'
      title='Загрузка задачи'
      points={
        <UISkeleton>
          <span className='invisible'>3 SP</span>
        </UISkeleton>
      }
      badges={
        <UIBadge>
          <UISkeleton className='h-[1.35em] w-28' />
        </UIBadge>
      }
      meta={<UISkeleton className='h-avatar-xs w-20' />}
    />
  );
}
