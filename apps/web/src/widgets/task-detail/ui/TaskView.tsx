import { useEffect } from 'react';

import type { TaskDetail } from '@gwmt/contracts';

import { useSessionUser } from '@/entities/auth';
import { getBoardPermissions, useRememberCurrentBoard } from '@/entities/board';
import { getTaskTimerView } from '@/entities/task';
import { useBoardWorkspaceStore } from '@/features/board/workspace';
import { useServerNow } from '@/shared/lib/time';

import { TaskCommentsCard } from './TaskCommentsCard';
import { TaskLayout } from './TaskLayout';
import { TaskLinksCard } from './TaskLinksCard';
import { TaskPropertiesCard } from './TaskPropertiesCard';
import { TaskSummaryCard } from './TaskSummaryCard';
import { TaskTimeHistoryCard } from './TaskTimeHistoryCard';

/** Экран задачи: права роли решают, какие действия видны в каждой секции. */
export function TaskView({
  task,
  commentTarget,
  onDeleted,
}: {
  readonly task: TaskDetail;
  readonly commentTarget?: { hash: string; key: string };
  readonly onDeleted: () => void;
}) {
  const me = useSessionUser();
  const { focusTask } = useBoardWorkspaceStore();
  const now = useServerNow();
  const permissions = getBoardPermissions(task.myRole);
  useRememberCurrentBoard(task.board.id);

  // Вернувшись на доску, пользователь увидит эту карточку выделенной,
  // даже если открыл задачу по ссылке, минуя доску
  useEffect(() => {
    focusTask(task.key);
  }, [focusTask, task.key]);

  return (
    <TaskLayout
      summary={
        <TaskSummaryCard
          task={task}
          now={now}
          canEdit={permissions.canEditTask}
          canDelete={permissions.canDeleteTask}
          onDeleted={onDeleted}
        />
      }
      timeHistory={
        <TaskTimeHistoryCard task={task} now={now} timeZone={me.timezone} />
      }
      properties={
        <TaskPropertiesCard
          task={task}
          timer={getTaskTimerView(task.status, task.timer, now)}
          permissions={permissions}
          currentUserId={me.id}
          timeZone={me.timezone}
          now={now}
        />
      }
      links={<TaskLinksCard task={task} canLink={permissions.canLinkTasks} />}
      comments={
        <TaskCommentsCard
          task={task}
          currentUserId={me.id}
          commentTarget={commentTarget}
          canComment={permissions.canComment}
          timeZone={me.timezone}
        />
      }
    />
  );
}
