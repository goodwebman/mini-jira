import { useState } from 'react';

import type { TaskDetail } from '@gwmt/contracts';
import { Link } from 'react-router';

import { TaskLinkRow } from '@/entities/task';
import { LinkTaskDialog, useUnlinkTask } from '@/features/task/link-tasks';
import { ROUTES } from '@/shared/routes';
import { UIButton, UICard } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** Связанные задачи: список, «Связать» и удаление связи — если роль позволяет. */
export function TaskLinksCard({
  task,
  canLink,
}: {
  readonly task: Pick<TaskDetail, 'key' | 'links'>;
  readonly canLink: boolean;
}) {
  const [linking, setLinking] = useState(false);
  const { unlink, pendingKey } = useUnlinkTask(task.key);

  return (
    <UICard padding='lg' className='flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-3'>
        <UICard.Title as='h3' size='sm'>
          Связанные задачи · {task.links.length}
        </UICard.Title>
        {canLink && (
          <UIButton variant='secondary' onClick={() => setLinking(true)}>
            <UIIcons.Link />
            Связать
          </UIButton>
        )}
      </div>
      {task.links.length === 0 && (
        <div className='py-2 text-muted-foreground'>Связей пока нет</div>
      )}
      {task.links.map((link) => (
        <TaskLinkRow
          key={`${link.type}-${link.task.key}`}
          link={link}
          render={<Link to={ROUTES.TASK.build(link.task.key)} />}
          onRemove={canLink ? () => unlink(link.task.key) : undefined}
          removing={pendingKey === link.task.key}
        />
      ))}
      <LinkTaskDialog
        taskKey={task.key}
        open={linking}
        onOpenChange={setLinking}
      />
    </UICard>
  );
}
