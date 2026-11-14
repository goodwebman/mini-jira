import { type FormEvent, useState } from 'react';

import {
  TASK_LINK_LABELS,
  TASK_LINK_TYPES,
  type TaskLinkType,
} from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';

import { TASK_STATUS_LABELS, taskSearchQueryOptions } from '@/entities/task';
import { readApiError } from '@/shared/api';
import { useDebouncedValue } from '@/shared/lib/hooks';
import {
  UIButton,
  UIDialog,
  UIField,
  UIOptionCard,
  UISearchInput,
  UISegmented,
  UISkeleton,
  useToast,
} from '@/shared/ui';

import { useLinkTask } from '../model/use-task-links';

const LINK_TYPE_OPTIONS = TASK_LINK_TYPES.map((value) => ({
  value,
  label: TASK_LINK_LABELS[value],
}));

export function LinkTaskForm({
  taskKey,
  onDone,
}: {
  readonly taskKey: string;
  readonly onDone: () => void;
}) {
  const [type, setType] = useState<TaskLinkType>('rel');
  const [query, setQuery] = useState('');
  const [targetKey, setTargetKey] = useState<null | string>(null);
  const [error, setError] = useState('');
  const debounced = useDebouncedValue(query.trim());
  const search = useQuery({
    ...taskSearchQueryOptions({
      q: debounced,
      excludeLinkedTo: taskKey,
      limit: 6,
    }),
    placeholderData: (previous) => previous,
  });
  const link = useLinkTask(taskKey);
  const { toast } = useToast();
  const candidates = search.data?.items ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!targetKey) {
      setError('Выберите задачу');
      return;
    }
    link.mutate(
      { type, targetKey },
      {
        onSuccess: () => {
          toast('Задачи связаны');
          onDone();
        },
        onError: (cause) => setError(readApiError(cause).message),
      },
    );
  };

  return (
    <UIDialog.Content title={`Связать задачу с ${taskKey}`} size='md'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='flex flex-col gap-4'>
          <UIField label='Тип связи'>
            <UISegmented
              aria-label='Тип связи'
              options={LINK_TYPE_OPTIONS}
              value={type}
              onValueChange={setType}
            />
          </UIField>
          <UIField label='Найти задачу'>
            <UISearchInput
              placeholder='Название или ключ'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery('')}
            />
          </UIField>
          <UIField
            label='Задача'
            error={error || undefined}
            hint={
              search.isSuccess && candidates.length === 0
                ? 'Ничего не найдено'
                : undefined
            }
          >
            <div role='group' className='flex flex-col gap-1'>
              {search.isPending
                ? ['a', 'b', 'c'].map((key) => (
                    <UISkeleton key={key} className='h-14' />
                  ))
                : candidates.map((candidate) => (
                    <UIOptionCard
                      key={candidate.key}
                      title={candidate.title}
                      meta={`${candidate.key} · ${candidate.board.name}`}
                      aside={TASK_STATUS_LABELS[candidate.status]}
                      selected={candidate.key === targetKey}
                      onClick={() => {
                        setTargetKey(candidate.key);
                        setError('');
                      }}
                    />
                  ))}
            </div>
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close>Отмена</UIDialog.Close>
          <UIButton type='submit' loading={link.isPending}>
            Связать
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
