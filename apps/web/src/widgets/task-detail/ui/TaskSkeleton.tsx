import type { BoardRole, TaskCard } from '@gwmt/contracts';

import { TaskPriorityMark, TaskStatusBadge } from '@/entities/task';
import {
  UIButton,
  UICard,
  UICheckbox,
  UIEmptyState,
  UIField,
  UISkeleton,
  UITextarea,
} from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { TaskLayout } from './TaskLayout';
import { TaskPropertyRow } from './TaskPropertyRow';

export function TaskSkeleton({
  task,
  role = 'admin',
}: {
  readonly task?: TaskCard;
  readonly role?: BoardRole;
}) {
  const status = task?.status ?? 'todo';
  const canWrite = role !== 'guest';
  return (
    <div aria-busy='true' aria-label='Загрузка задачи'>
      <TaskLayout
        summary={
          <UICard padding='lg' className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <UISkeleton>
                <span className='invisible inline-flex'>
                  <TaskStatusBadge status={status} />
                </span>
              </UISkeleton>
              <UISkeleton>
                <span className='invisible inline-flex'>
                  <TaskPriorityMark
                    priority={task?.priority ?? 'med'}
                    withLabel
                  />
                </span>
              </UISkeleton>
              <UISkeleton className='h-[1.35em] w-10 text-small' />
              <span className='ml-auto'>
                <UISkeleton>
                  <div className='invisible'>
                    <UIButton variant='secondary' disabled>
                      <UIIcons.Copy />
                      Скопировать ссылку
                    </UIButton>
                  </div>
                </UISkeleton>
              </span>
            </div>
            <UISkeleton>
              <h2 className='invisible m-0 text-display font-semibold tracking-title wrap-anywhere'>
                {task?.title ?? 'Загрузка задачи'}
              </h2>
            </UISkeleton>
            <UISkeleton className='h-[1.43em] w-full' />
          </UICard>
        }
        properties={
          <UICard className='grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 xl:grid-cols-[128px_minmax(0,1fr)]'>
            <div className='col-span-full flex flex-col gap-2 rounded-card px-4 py-3'>
              <div className='flex items-center gap-2'>
                <UIIcons.Clock className='invisible size-icon-lg shrink-0' />
                <UISkeleton className='h-[1.5em] flex-1 text-lead' />
              </div>
              {canWrite && ['work', 'review', 'test'].includes(status) && (
                <UISkeleton className='h-control w-full' />
              )}
            </div>
            {role === 'admin' && status === 'todo' && (
              <UISkeleton className='col-span-full'>
                <div className='invisible'>
                  <UICheckbox label='Запретить брать в работу' disabled />
                </div>
              </UISkeleton>
            )}
            {[
              'Статус',
              'Приоритет',
              'Оценка, SP',
              'Автор',
              'Ревьювер',
              'Тестировщик',
              'Дизайнер',
              'Создана',
              'Доска',
            ].map((label) => (
              <TaskPropertyRow key={label} label={label}>
                <UISkeleton className='h-control w-full' />
              </TaskPropertyRow>
            ))}
          </UICard>
        }
        timeHistory={
          <UICard padding='lg' className='flex flex-col gap-3'>
            <UICard.Title as='h3' size='sm'>
              Время задачи
            </UICard.Title>
            <dl className='m-0 grid grid-cols-2 gap-3 sm:grid-cols-3'>
              {['Затрачено без пауз', 'На паузе', 'Взята в работу'].map(
                (label) => (
                  <div key={label}>
                    <dt className='text-small text-muted-foreground'>
                      {label}
                    </dt>
                    <dd className='m-0'>
                      <UISkeleton className='h-[1.43em] w-20' />
                    </dd>
                  </div>
                ),
              )}
            </dl>
            <UISkeleton className='h-[1.35em] w-3/4 text-small' />
            <UISkeleton className='h-[1.35em] w-3/4 text-small' />
          </UICard>
        }
        links={
          <UICard padding='lg' className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-3'>
              <UICard.Title as='h3' size='sm'>
                Связанные задачи
              </UICard.Title>
              {canWrite && (
                <UISkeleton>
                  <div className='invisible'>
                    <UIButton variant='secondary' disabled>
                      <UIIcons.Link />
                      Связать
                    </UIButton>
                  </div>
                </UISkeleton>
              )}
            </div>
            <div className='py-2'>
              <UISkeleton className='h-[1.43em] w-full' />
            </div>
          </UICard>
        }
        comments={
          <UICard padding='lg' className='flex flex-col gap-3'>
            <UICard.Title as='h3' size='sm'>
              Комментарии
            </UICard.Title>
            {!canWrite && (
              <UISkeleton>
                <div className='invisible'>
                  <UIEmptyState title='Комментариев пока нет' />
                </div>
              </UISkeleton>
            )}
            {canWrite && (
              <div className='flex flex-col gap-3'>
                <UIField label='Новый комментарий'>
                  <UISkeleton>
                    <div className='invisible'>
                      <UITextarea rows={3} maxLength={10_000} disabled />
                    </div>
                  </UISkeleton>
                </UIField>
                <div>
                  <UISkeleton className='w-fit'>
                    <div className='invisible'>
                      <UIButton disabled>Отправить</UIButton>
                    </div>
                  </UISkeleton>
                </div>
              </div>
            )}
          </UICard>
        }
      />
    </div>
  );
}
