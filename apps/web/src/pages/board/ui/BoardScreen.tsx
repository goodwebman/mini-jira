import { useState } from 'react';

import type { TaskStatus } from '@gwmt/contracts';
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import {
  BoardMembersButton,
  BoardReadOnlyBanner,
  assignableMembers,
  boardQueryOptions,
  getBoardPermissions,
  useRememberCurrentBoard,
} from '@/entities/board';
import { sprintCaption } from '@/entities/sprint';
import {
  TaskPriorityFilter,
  TaskSearchInput,
  boardTasksQueryOptions,
} from '@/entities/task';
import {
  effectiveFilters,
  useBoardWorkspace,
} from '@/features/board/workspace';
import { CreateTaskDialog } from '@/features/task/create-task';
import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIPageHeader, UIRequestError } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { ShellPage, useAppShell } from '@/widgets/app-shell';
import {
  AssigneeFilterChips,
  BoardLayout,
  KanbanSkeleton,
} from '@/widgets/kanban-board';

import { BoardTasks } from './BoardTasks';

export function BoardScreen({ boardId }: { readonly boardId: number }) {
  const user = useSessionUser();
  const workspace = useBoardWorkspace();
  const shell = useAppShell();
  const navigate = useNavigate();
  usePrefetchQuery(boardTasksQueryOptions(boardId));
  const { data: board } = useSuspenseQuery(boardQueryOptions(boardId));
  const [createStatus, setCreateStatus] = useState<null | TaskStatus>(null);
  useRememberCurrentBoard(board.id);

  const permissions = getBoardPermissions(board.myRole);
  const people = assignableMembers(board.members);
  const filters = effectiveFilters(
    workspace.filters,
    people.map((member) => member.id),
  );

  return (
    <ShellPage
      title={board.name}
      caption={sprintCaption(board.currentSprint)}
      onTitleClick={shell.openBoardsSwitcher}
      actions={
        permissions.canCreateTask && (
          <UIPageHeader.Action
            icon={<UIIcons.Plus />}
            label='Создать задачу'
            onClick={() => setCreateStatus('todo')}
          />
        )
      }
      banner={permissions.isReadOnly && <BoardReadOnlyBanner />}
      scroll='fixed'
    >
      <BoardLayout>
        <BoardLayout.Toolbar>
          <TaskSearchInput
            value={workspace.filters.query}
            onValueChange={workspace.setQuery}
            className='min-w-0 flex-[1_1_220px] sm:max-w-[320px] xl:max-w-[420px]'
          />
          <TaskPriorityFilter
            value={workspace.filters.priority}
            onValueChange={workspace.setPriority}
            wrapperClassName='min-w-0 flex-[1_1_150px] sm:max-w-[200px] xl:max-w-[260px]'
          />
          <BoardMembersButton
            count={board.members.length}
            render={<Link to={ROUTES.BOARD_MEMBERS.build(board.id)} />}
          />
        </BoardLayout.Toolbar>

        <BoardLayout.People>
          <AssigneeFilterChips
            people={people}
            selectedIds={filters.assigneeIds}
            onToggle={workspace.toggleAssignee}
            onClear={workspace.clearAssignees}
            onAddPeople={
              permissions.canManageMembers
                ? () => void navigate(ROUTES.BOARD_MEMBERS.build(board.id))
                : undefined
            }
          />
        </BoardLayout.People>

        <AsyncBoundary
          resetKeys={[boardId]}
          fallback={
            <KanbanSkeleton
              role={board.myRole}
              phoneColumn={workspace.phoneColumn}
            />
          }
          renderError={({ error, retry }) => (
            <UIRequestError error={error} retry={retry} />
          )}
        >
          <BoardTasks
            board={board}
            filters={filters}
            onCreateTask={setCreateStatus}
          />
        </AsyncBoundary>
      </BoardLayout>

      <CreateTaskDialog
        open={createStatus !== null}
        onOpenChange={(open) => {
          if (!open) setCreateStatus(null);
        }}
        boardId={board.id}
        initialStatus={createStatus ?? 'todo'}
        currentUserId={user.id}
        timeZone={user.timezone}
      />
    </ShellPage>
  );
}
