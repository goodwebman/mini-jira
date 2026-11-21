import type { MyTaskStats } from '@gwmt/contracts';
import { Link } from 'react-router';

import { TaskPriorityMark } from '@/entities/task';
import { ROUTES } from '@/shared/routes';
import { UICard, UIEmptyState, UILink } from '@/shared/ui';
import { EmptyTasks } from '@/shared/ui/icons';

/** Ближайшие открытые задачи и ссылка на весь список. */
export function RecentTasksCard({
  tasks,
}: {
  readonly tasks: MyTaskStats['nextOpen'];
}) {
  return (
    <UICard className='flex flex-col gap-1'>
      <div className='flex items-baseline justify-between gap-3 pb-2'>
        <UICard.Title as='h2' size='sm'>
          Последние задачи
        </UICard.Title>
        <UILink render={<Link to={ROUTES.MY_TASKS.build()} />}>
          Все задачи
        </UILink>
      </div>
      {tasks.length === 0 && (
        <UIEmptyState
          className='p-2'
          icon={<EmptyTasks title='Открытых задач нет' className='size-16' />}
        />
      )}
      {tasks.map((task) => (
        <Link
          key={task.key}
          to={ROUTES.TASK.build(task.key)}
          className='flex min-h-control-lg items-center gap-2 border-t border-border text-foreground no-underline transition-colors focus-ring hover:bg-background'
        >
          <TaskPriorityMark priority={task.priority} />
          <span className='min-w-0 flex-1 truncate'>{task.title}</span>
          <span className='flex-none text-caption text-muted-foreground'>
            {task.key}
          </span>
        </Link>
      ))}
    </UICard>
  );
}
