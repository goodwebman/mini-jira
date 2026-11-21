import { type FormEvent, useState } from 'react';

import { updateBoardBodySchema } from '@gwmt/contracts';

import type { BoardDetail } from '@/entities/board';
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

import { useUpdateBoard } from '../model/use-update-board';

export function EditBoardForm({
  board,
  onDone,
}: {
  readonly board: Pick<BoardDetail, 'description' | 'id' | 'name'>;
  readonly onDone: () => void;
}) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description);
  const mutation = useUpdateBoard(board.id);
  const { toast } = useToast();
  const body = {
    ...(name.trim() !== board.name ? { name } : {}),
    ...(description !== board.description ? { description } : {}),
  };
  const canSubmit = name.trim().length > 0 && Object.keys(body).length > 0;
  const parsed = canSubmit ? updateBoardBodySchema.safeParse(body) : undefined;
  const issues = parsed && !parsed.success ? parsed.error.issues : [];
  const error = mutation.error ? readApiError(mutation.error) : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!parsed?.success || mutation.isPending) return;
    mutation.mutate(parsed.data, {
      onSuccess: (updated) => {
        toast(`Доска «${updated.name}» сохранена`);
        onDone();
      },
    });
  };

  return (
    <UIDialog.Content title='Редактирование доски'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='flex flex-col gap-4'>
          {error && Object.keys(error.fields).length === 0 && (
            <UIAlert tone='danger'>{error.message}</UIAlert>
          )}
          <UIField
            label='Название'
            error={
              error?.fields.name ??
              issues.find((issue) => issue.path[0] === 'name')?.message
            }
          >
            <UIInput
              value={name}
              maxLength={100}
              disabled={mutation.isPending}
              onChange={(event) => {
                setName(event.target.value);
                mutation.reset();
              }}
            />
          </UIField>
          <UIField
            label='Описание'
            optional
            error={
              error?.fields.description ??
              issues.find((issue) => issue.path[0] === 'description')?.message
            }
          >
            <UITextarea
              rows={3}
              value={description}
              maxLength={2000}
              disabled={mutation.isPending}
              onChange={(event) => {
                setDescription(event.target.value);
                mutation.reset();
              }}
            />
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close disabled={mutation.isPending}>Отмена</UIDialog.Close>
          <UIButton
            type='submit'
            disabled={!parsed?.success}
            loading={mutation.isPending}
          >
            Сохранить
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
