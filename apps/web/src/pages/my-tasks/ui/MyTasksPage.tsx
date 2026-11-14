import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import { useCurrentBoardId } from '@/entities/board';
import {
  TaskRoleFilter,
  TaskSearchInput,
  TaskStatusFilter,
  myTasksQueryOptions,
} from '@/entities/task';
import { CreateTaskDialog } from '@/features/task/create-task';
import { countLabel, formatNumber } from '@/shared/lib/format';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { useServerNow } from '@/shared/lib/time';
import {
  UIButton,
  UIEmptyState,
  UIPageHeader,
  UIRequestError,
  UISkeleton,
} from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { ShellPage } from '@/widgets/app-shell';
import {
  MyTasksCards,
  MyTasksLayout,
  MyTasksPager,
  MyTasksTable,
} from '@/widgets/my-tasks-list';

import {
  type MyTasksParams,
  PAGE_SIZE,
  readMyTasksParams,
  writeMyTasksParams,
} from '../model/my-tasks-params';

const TASK_FORMS = ['задача', 'задачи', 'задач'] as const;

/** Задачи, где пользователь автор, ревьювер, тестировщик или дизайнер, со всех досок. */
export function MyTasksPage() {
  const user = useSessionUser();
  const currentBoardId = useCurrentBoardId();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readMyTasksParams(searchParams);
  const [creating, setCreating] = useState(false);
  // Адрес меняется сразу, а запрос к серверу уходит после паузы ввода
  const q = useDebouncedValue(params.q.trim());
  const tasks = useQuery({
    ...myTasksQueryOptions({
      q: q || undefined,
      status: params.status === 'all' ? undefined : params.status,
      role: params.role === 'all' ? undefined : params.role,
      page: params.page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: (previous) => previous,
  });
  const now = useServerNow();

  const update = (patch: Partial<MyTasksParams>) =>
    setSearchParams(writeMyTasksParams(params, patch), { replace: true });

  const data = tasks.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  // Страница из старой ссылки или опустевшая после изменений: не оставляем тупик
  const pastTheEnd =
    data !== undefined && data.items.length === 0 && params.page > 1;

  return (
    <ShellPage
      title='Мои задачи'
      caption={
        data
          ? `${countLabel(data.summary.totalCount, TASK_FORMS)} · ${formatNumber(data.summary.totalSp)} SP`
          : ' '
      }
      actions={
        <UIPageHeader.Action
          icon={<UIIcons.Plus />}
          label='Создать задачу'
          onClick={() => setCreating(true)}
        />
      }
    >
      <MyTasksLayout>
        <MyTasksLayout.Filters>
          <TaskSearchInput
            placeholder='Поиск по задачам'
            value={params.q}
            onValueChange={(value) => update({ q: value })}
            className='min-w-0 flex-[1_1_200px] sm:max-w-[320px] xl:max-w-[420px]'
          />
          <TaskStatusFilter
            value={params.status}
            onValueChange={(status) => update({ status })}
            wrapperClassName='min-w-0 flex-[1_1_140px] sm:max-w-[200px]'
          />
          <TaskRoleFilter
            value={params.role}
            onValueChange={(role) => update({ role })}
            wrapperClassName='min-w-0 flex-[1_1_140px] sm:max-w-[200px]'
          />
        </MyTasksLayout.Filters>

        {tasks.isPending && <UISkeleton className='h-80' />}
        {tasks.isError && (
          <UIRequestError
            error={tasks.error}
            retry={() => void tasks.refetch()}
          />
        )}
        {pastTheEnd && (
          <UIEmptyState
            boxed
            title='На этой странице задач нет'
            action={
              <UIButton variant='secondary' onClick={() => update({ page: 1 })}>
                К первой странице
              </UIButton>
            }
          />
        )}
        {data && data.items.length === 0 && !pastTheEnd && (
          <UIEmptyState boxed title='Задач по этим условиям нет' />
        )}
        {data && data.items.length > 0 && (
          <div aria-busy={tasks.isFetching} className='flex flex-col gap-3'>
            <MyTasksTable
              rows={data.items}
              now={now}
              timeZone={user.timezone}
            />
            <MyTasksCards rows={data.items} now={now} />
            {pages > 1 && (
              <MyTasksLayout.Pager>
                <MyTasksPager
                  page={params.page}
                  pages={pages}
                  onPage={(next) => update({ page: next })}
                />
              </MyTasksLayout.Pager>
            )}
          </div>
        )}
      </MyTasksLayout>

      <CreateTaskDialog
        open={creating}
        onOpenChange={setCreating}
        boardId={currentBoardId}
        currentUserId={user.id}
        timeZone={user.timezone}
      />
    </ShellPage>
  );
}
