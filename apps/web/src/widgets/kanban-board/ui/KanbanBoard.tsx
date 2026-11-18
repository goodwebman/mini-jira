import type {
  BoardRole,
  MoveActor,
  TaskCard as TaskCardData,
  TaskStatus,
} from '@gwmt/contracts';
import { Link } from 'react-router';

import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TaskCard,
  canCreateInStatus,
  getTaskTimerView,
  groupTasksByStatus,
  sumSp,
  taskPeople,
} from '@/entities/task';
import { UserAvatarStack } from '@/entities/user';
import {
  useChangeTaskStatus,
  useTaskDragAndDrop,
} from '@/features/task/change-status';
import { TaskPauseButton } from '@/features/task/toggle-pause';
import { formatShortDate, formatSp } from '@/shared/lib/format';
import { useServerNow } from '@/shared/lib/time';
import { ROUTES } from '@/shared/routes';
import { UIKanbanColumn } from '@/shared/ui';

import { BoardLayout } from './BoardLayout';

export interface IKanbanBoardProps {
  readonly boardId: number;
  readonly taskSearch: string;
  readonly tasks: readonly TaskCardData[];
  readonly actor: MoveActor;
  readonly role: BoardRole;
  readonly canPause: boolean;
  readonly timeZone: string;
  readonly phoneColumn: TaskStatus;
  readonly focusedTaskKey: null | string;
  readonly onOpenTask: (taskKey: string) => void;
  readonly onCreateTask: (status: TaskStatus) => void;
}

/**
 * Канбан. Карточки — сущность задачи, перетаскивание — фича смены статуса,
 * пауза — фича паузы: страница только соединяет их на одной доске.
 */
export function KanbanBoard({
  boardId,
  taskSearch,
  tasks,
  actor,
  role,
  canPause,
  timeZone,
  phoneColumn,
  focusedTaskKey,
  onOpenTask,
  onCreateTask,
}: IKanbanBoardProps) {
  const now = useServerNow();
  const { changeStatus, canMove } = useChangeTaskStatus(actor);
  const dnd = useTaskDragAndDrop({
    tasks,
    enabled: role !== 'guest',
    canDrop: canMove,
    onDrop: changeStatus,
  });
  const columns = groupTasksByStatus(tasks);

  return (
    <BoardLayout.Columns>
      {TASK_STATUSES.map((status) => {
        const cards = columns[status];
        const { dropState, ...dropHandlers } = dnd.columnProps(status);
        return (
          <UIKanbanColumn
            key={status}
            status={status}
            title={TASK_STATUS_LABELS[status]}
            count={cards.length}
            meta={formatSp(sumSp(cards))}
            dropState={dropState}
            onAdd={
              canCreateInStatus(role, status)
                ? () => onCreateTask(status)
                : undefined
            }
            // На телефоне видна одна колонка: выбор — чипами над доской
            className={status === phoneColumn ? undefined : 'max-sm:hidden'}
            {...dropHandlers}
          >
            {cards.map((task) => {
              const timer = getTaskTimerView(task.status, task.timer, now);
              return (
                <TaskCard
                  key={task.key}
                  task={task}
                  now={now}
                  timer={timer}
                  createdLabel={formatShortDate(task.createdAt, timeZone)}
                  selected={task.key === focusedTaskKey}
                  className={
                    dnd.draggingKey === task.key ? 'opacity-60' : undefined
                  }
                  timerAction={
                    canPause && (
                      <TaskPauseButton taskKey={task.key} timer={timer} />
                    )
                  }
                  people={
                    <UserAvatarStack
                      people={taskPeople(task.people).map(
                        ({ user, roleLabel }) => ({
                          user,
                          title: `${roleLabel}: ${user.name}`,
                        }),
                      )}
                      max={3}
                    />
                  }
                  render={
                    <Link
                      to={{
                        pathname: ROUTES.BOARD_TASK.build(boardId, task.key),
                        search: taskSearch,
                      }}
                      onClick={() => onOpenTask(task.key)}
                    />
                  }
                  {...dnd.cardProps(task)}
                />
              );
            })}
          </UIKanbanColumn>
        );
      })}
    </BoardLayout.Columns>
  );
}
