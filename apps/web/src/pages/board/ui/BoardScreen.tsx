import { useState } from 'react';

import type { TaskStatus } from '@gwmt/contracts';
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router';

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
  effectiveFilters,
} from '@/entities/task';
import { DeleteBoardButton } from '@/features/board/delete-board';
import { EditBoardButton } from '@/features/board/edit-board';
import { useBoardWorkspace } from '@/features/board/workspace';
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
  const { search } = useLocation();
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
  const { updateFilters } = workspace;

  return (
    <ShellPage
      title={board.name}
      caption={sprintCaption(board.currentSprint)}
      onTitleClick={shell.openBoardsSwitcher}
      actions={
        <>
          {permissions.canManageBoard && (
            <>
              <EditBoardButton board={board} />
              <DeleteBoardButton
                board={board}
                onDeleted={() =>
                  navigate(ROUTES.BOARDS.build(), { replace: true })
                }
              />
            </>
          )}
          {permissions.canCreateTask && (
            <UIPageHeader.Action
              icon={<UIIcons.Plus />}
              label='Создать задачу'
              onClick={() => setCreateStatus('todo')}
            />
          )}
        </>
      }
      banner={permissions.isReadOnly && <BoardReadOnlyBanner />}
      scroll='fixed'
    >
      <BoardLayout>
        <BoardLayout.Toolbar>
          <TaskSearchInput
            value={filters.query}
            onValueChange={(query) => updateFilters({ query })}
            className='min-w-0 flex-[1_1_100%] w640:max-w-[320px] w640:flex-[1_1_200px] w1920:max-w-[420px]'
          />
          <TaskPriorityFilter
            value={filters.priority}
            onValueChange={(priority) => updateFilters({ priority })}
            wrapperClassName='min-w-0 flex-[1_1_144px] w640:max-w-[200px] w1920:max-w-[260px]'
          />
          <BoardMembersButton
            count={board.members.length}
            render={
              <Link
                to={{ pathname: ROUTES.BOARD_MEMBERS.build(board.id), search }}
              />
            }
          />
        </BoardLayout.Toolbar>

        <BoardLayout.People>
          <AssigneeFilterChips
            people={people}
            selectedIds={filters.assigneeIds}
            onToggle={(id) =>
              updateFilters({
                assigneeIds: filters.assigneeIds.includes(id)
                  ? filters.assigneeIds.filter((selected) => selected !== id)
                  : [...filters.assigneeIds, id],
              })
            }
            onClear={() => updateFilters({ assigneeIds: [] })}
            onAddPeople={
              permissions.canManageMembers
                ? () =>
                    void navigate({
                      pathname: ROUTES.BOARD_MEMBERS.build(board.id),
                      search,
                    })
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
            search={search}
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
