import type { TaskDetail } from '@gwmt/contracts';

import { TaskPriorityMark, TaskStatusBadge } from '@/entities/task';
import { CopyTaskLinkButton } from '@/features/task/copy-link';
import { formatSp } from '@/shared/lib/format';
import { UICard } from '@/shared/ui';

/** Шапка задачи: статус, приоритет, оценка, ссылка, название и описание. */
export function TaskSummaryCard({ task }: { readonly task: TaskDetail }) {
  return (
    <UICard padding='lg' className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <TaskStatusBadge status={task.status} />
        <TaskPriorityMark priority={task.priority} withLabel />
        <span className='text-small text-muted-foreground'>
          {formatSp(task.sp)}
        </span>
        <span className='ml-auto'>
          <CopyTaskLinkButton taskKey={task.key} />
        </span>
      </div>
      <h2 className='m-0 text-display font-semibold tracking-title wrap-anywhere'>
        {task.title}
      </h2>
      <p className='m-0 whitespace-pre-line wrap-anywhere'>
        {task.description || 'Описание не заполнено.'}
      </p>
    </UICard>
  );
}
