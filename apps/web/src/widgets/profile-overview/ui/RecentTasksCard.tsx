import type { MyTaskStats } from '@gwmt/contracts';
import { Link } from 'react-router';

import { TaskPriorityMark } from '@/entities/task';
import { ROUTES } from '@/shared/routes';
import { UICard, UILink } from '@/shared/ui';

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
        <p className='m-0 py-2 text-muted-foreground'>Открытых задач нет</p>
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
