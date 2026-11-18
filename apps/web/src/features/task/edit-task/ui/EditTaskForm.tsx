import { type FormEvent, useState } from 'react';

import { type TaskDetail, updateTaskBodySchema } from '@gwmt/contracts';

import { readApiError } from '@/shared/api';
import {
  UIAlert,
  UIButton,
  UIDialog,
  UIField,
  UIInput,
  UITextarea,
  useToast,
} from '@/shared/ui';

import { useUpdateTask } from '../model/use-update-task';

export function EditTaskForm({
  task,
  onDone,
}: {
  readonly task: TaskDetail;
  readonly onDone: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const mutation = useUpdateTask(task.key, { toast: false });
  const { toast } = useToast();
  const body = {
    ...(title.trim() !== task.title ? { title } : {}),
    ...(description !== task.description ? { description } : {}),
  };
  const canSubmit = title.trim().length > 0 && Object.keys(body).length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    setFormError('');
    const result = updateTaskBodySchema.safeParse(body);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    mutation.mutate(result.data, {
      onSuccess: () => {
        toast(`Задача ${task.key} сохранена`);
        onDone();
      },
      onError: (cause) => {
        const info = readApiError(cause);
        setErrors(info.fields);
        if (Object.keys(info.fields).length === 0) setFormError(info.message);
      },
    });
  };

  return (
    <UIDialog.Content title='Редактирование задачи' size='lg'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='flex flex-col gap-4'>
          {formError && <UIAlert tone='danger'>{formError}</UIAlert>}
          <UIField label='Название' error={errors.title}>
            <UIInput
              value={title}
              maxLength={255}
              disabled={mutation.isPending}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((current) => ({ ...current, title: '' }));
              }}
            />
          </UIField>
          <UIField label='Описание' optional error={errors.description}>
            <UITextarea
              value={description}
              rows={5}
              disabled={mutation.isPending}
              onChange={(event) => {
                setDescription(event.target.value);
                setErrors((current) => ({ ...current, description: '' }));
              }}
            />
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close disabled={mutation.isPending}>Отмена</UIDialog.Close>
          <UIButton
            type='submit'
            disabled={!canSubmit}
            loading={mutation.isPending}
          >
            Сохранить
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
