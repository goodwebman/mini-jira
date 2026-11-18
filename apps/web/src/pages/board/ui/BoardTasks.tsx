import type { BoardDetail, TaskStatus } from '@gwmt/contracts';

import { useSessionUser } from '@/entities/auth';
import { getBoardPermissions } from '@/entities/board';
import { type TaskFilters, filterTasks } from '@/entities/task';
import { useLiveBoardTasks } from '@/features/board/sync-tasks';
import { useBoardWorkspace } from '@/features/board/workspace';
import {
  BoardLayout,
  KanbanBoard,
  PhoneColumnChips,
} from '@/widgets/kanban-board';

export function BoardTasks({
  board,
  filters,
  search,
  onCreateTask,
}: {
  readonly board: BoardDetail;
  readonly filters: TaskFilters;
  readonly search: string;
  readonly onCreateTask: (status: TaskStatus) => void;
}) {
  const user = useSessionUser();
  const workspace = useBoardWorkspace();
  const { data: tasks } = useLiveBoardTasks(board.id);
  const visible = filterTasks(tasks.items, filters);
  return (
    <>
      <BoardLayout.PhoneColumns>
        <PhoneColumnChips
          tasks={visible}
          value={workspace.phoneColumn}
          onSelect={workspace.selectPhoneColumn}
        />
      </BoardLayout.PhoneColumns>
      <KanbanBoard
        boardId={board.id}
        taskSearch={search}
        tasks={visible}
        actor={{ id: user.id, role: board.myRole }}
        role={board.myRole}
        canPause={getBoardPermissions(board.myRole).canPauseTasks}
        timeZone={user.timezone}
        phoneColumn={workspace.phoneColumn}
        focusedTaskKey={workspace.focusedTaskKey}
        onOpenTask={workspace.focusTask}
        onCreateTask={onCreateTask}
      />
    </>
  );
}
