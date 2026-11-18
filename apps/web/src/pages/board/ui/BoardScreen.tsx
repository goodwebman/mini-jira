import { useState } from 'react';

import type { TaskStatus } from '@gwmt/contracts';
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';

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
  type TaskFilters,
  TaskPriorityFilter,
  TaskSearchInput,
  boardTasksQueryOptions,
  effectiveFilters,
} from '@/entities/task';
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

import {
  readBoardFilters,
  writeBoardFilters,
} from '../model/board-filter-params';
import { BoardTasks } from './BoardTasks';

export function BoardScreen({ boardId }: { readonly boardId: number }) {
  const user = useSessionUser();
  const workspace = useBoardWorkspace();
  const shell = useAppShell();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  usePrefetchQuery(boardTasksQueryOptions(boardId));
  const { data: board } = useSuspenseQuery(boardQueryOptions(boardId));
  const [createStatus, setCreateStatus] = useState<null | TaskStatus>(null);
  useRememberCurrentBoard(board.id);

  const permissions = getBoardPermissions(board.myRole);
  const people = assignableMembers(board.members);
  const filters = effectiveFilters(
    readBoardFilters(searchParams),
    people.map((member) => member.id),
  );
  const updateFilters = (patch: Partial<TaskFilters>) =>
    setSearchParams((current) => writeBoardFilters(current, patch), {
      replace: true,
      preventScrollReset: true,
    });

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
            value={filters.query}
            onValueChange={(query) => updateFilters({ query })}
            className='min-w-0 flex-[1_1_220px] sm:max-w-[320px] xl:max-w-[420px]'
          />
          <TaskPriorityFilter
            value={filters.priority}
            onValueChange={(priority) => updateFilters({ priority })}
            wrapperClassName='min-w-0 flex-[1_1_150px] sm:max-w-[200px] xl:max-w-[260px]'
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
