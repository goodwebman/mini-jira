import { type FormEvent, useState } from 'react';

import type { TaskStatus } from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';

import {
  assignableMembers,
  boardQueryOptions,
  boardsQueryOptions,
} from '@/entities/board';
import { TaskPrioritySelect, TaskStatusSelect } from '@/entities/task';
import { UserSelect } from '@/entities/user';
import { readApiError } from '@/shared/api';
import { formatLongDate } from '@/shared/lib/format';
import {
  UIAlert,
  UIButton,
  UIDialog,
  UIField,
  UIInput,
  UISelect,
  UITextarea,
  useToast,
} from '@/shared/ui';

import {
  type TaskDraft,
  type TaskDraftField,
  changeDraftBoard,
  createTaskDraft,
  defaultAuthorId,
  resolveDraftBoardId,
  validateTaskDraft,
} from '../model/task-draft';
import { useCreateTask } from '../model/use-create-task';

const HALF = 'w640:col-span-1';

export interface ICreateTaskFormProps {
  /** Доска по умолчанию: текущая. `null` — первая доступная. */
  readonly boardId: null | number;
  /** Колонка, из которой открыли форму. Рабочему всегда «К работе». */
  readonly initialStatus?: TaskStatus;
  readonly currentUserId: string;
  /** Пояс пользователя: в нём показывается дата создания. */
  readonly timeZone?: string;
  readonly onDone: () => void;
}

export function CreateTaskForm({
  boardId: initialBoardId,
  initialStatus,
  currentUserId,
  timeZone,
  onDone,
}: ICreateTaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    createTaskDraft({ boardId: initialBoardId, status: initialStatus }),
  );
  const [errors, setErrors] = useState<Partial<Record<TaskDraftField, string>>>(
    {},
  );
  const [formError, setFormError] = useState('');
  const { toast } = useToast();
  const create = useCreateTask();

  const boards = useQuery(boardsQueryOptions());
  const writable = boards.data?.items.filter(
    (board) => board.myRole !== 'guest',
  );
  const boardId = resolveDraftBoardId(
    draft.boardId,
    writable?.map((board) => board.id),
  );
  const board = useQuery({
    ...boardQueryOptions(boardId ?? 0),
    enabled: boardId !== null,
  });
  const members = assignableMembers(board.data?.members ?? []);
  const memberIds = members.map((member) => member.id);
  const role = board.data?.myRole ?? 'worker';
  // Производное, а не эффект: люди не с этой доски сбрасываются, автор по умолчанию — сам пользователь
  const people =
    boardId === null ? draft : changeDraftBoard(draft, boardId, memberIds);
  const view: TaskDraft = {
    ...people,
    authorId: people.authorId || defaultAuthorId(memberIds, currentUserId),
  };
  const canSubmit =
    board.isSuccess &&
    boardId !== null &&
    [view.title, view.sp, view.authorId, view.reviewerId].every(
      (value) => value.trim().length > 0,
    );

  const set = <K extends TaskDraftField>(field: K, value: TaskDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || create.isPending) return;
    setFormError('');
    const result = validateTaskDraft(view, role);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    create.mutate(result, {
      onSuccess: (card) => {
        toast(`Задача ${card.key} создана`);
        onDone();
      },
      onError: (cause) => {
        const info = readApiError(cause);
        if (Object.keys(info.fields).length > 0) setErrors(info.fields);
        else setFormError(info.message);
      },
    });
  };

  return (
    <UIDialog.Content title='Новая задача' size='lg'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='grid grid-cols-1 gap-4 w640:grid-cols-2'>
          {formError && (
            <UIAlert tone='danger' className='w640:col-span-2'>
              {formError}
            </UIAlert>
          )}
          <UIField
            label='Название'
            error={errors.title}
            className='w640:col-span-2'
          >
            <UIInput
              placeholder='Что нужно сделать'
              value={draft.title}
              maxLength={255}
              onChange={(event) => set('title', event.target.value)}
            />
          </UIField>
          <UIField
            label='Описание'
            optional
            error={errors.description}
            className='w640:col-span-2'
          >
            <UITextarea
              rows={3}
              placeholder='Подробности, ссылки, критерии готовности'
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </UIField>
          <UIField label='Доска' error={errors.boardId} className={HALF}>
            <UISelect
              value={boardId === null ? '' : String(boardId)}
              placeholder='Выберите доску'
              options={(writable ?? []).map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
              onValueChange={(value) => set('boardId', Number(value))}
            />
          </UIField>
          <UIField label='Статус' className={HALF}>
            {role === 'admin' ? (
              <TaskStatusSelect
                value={draft.status}
                onValueChange={(status) => set('status', status)}
              />
            ) : (
              <div className='flex min-h-control items-center text-muted-foreground'>
                К работе
              </div>
            )}
          </UIField>
          <UIField label='Приоритет' className={HALF}>
            <TaskPrioritySelect
              value={draft.priority}
              onValueChange={(priority) => set('priority', priority)}
            />
          </UIField>
          <UIField label='Оценка, SP' error={errors.sp} className={HALF}>
            <UIInput
              inputMode='decimal'
              placeholder='Например, 2,5'
              value={draft.sp}
              onChange={(event) => {
                const value = event.target.value.trim();
                if (/^\d*(?:[.,]\d*)?$/.test(value)) set('sp', value);
              }}
            />
          </UIField>
          <UIField label='Автор' error={errors.authorId} className={HALF}>
            <UserSelect
              users={members}
              value={view.authorId}
              placeholder='Выберите автора'
              onValueChange={(id) => set('authorId', id)}
            />
          </UIField>
          <UIField label='Ревьювер' error={errors.reviewerId} className={HALF}>
            <UserSelect
              users={members}
              value={view.reviewerId}
              placeholder='Выберите ревьювера'
              onValueChange={(id) => set('reviewerId', id)}
            />
          </UIField>
          <UIField label='Тестировщик' optional className={HALF}>
            <UserSelect
              users={members}
              optional
              value={view.testerId}
              onValueChange={(id) => set('testerId', id)}
            />
          </UIField>
          <UIField label='Дизайнер' optional className={HALF}>
            <UserSelect
              users={members}
              optional
              value={view.designerId}
              onValueChange={(id) => set('designerId', id)}
            />
          </UIField>
          <UIField label='Дата создания' className='w640:col-span-2'>
            <div className='text-muted-foreground'>
              {formatLongDate(new Date().toISOString(), timeZone)}, заполняется
              автоматически
            </div>
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close>Отмена</UIDialog.Close>
          <UIButton
            type='submit'
            disabled={!canSubmit}
            loading={create.isPending}
          >
            Создать задачу
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
