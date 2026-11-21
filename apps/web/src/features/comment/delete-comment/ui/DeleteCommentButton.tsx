import { useState } from 'react';

import { readApiError } from '@/shared/api';
import {
  UIAlert,
  UIButton,
  UIDialog,
  UIIconButton,
  UIIcons,
} from '@/shared/ui';

import { useDeleteComment } from '../model/use-delete-comment';

export function DeleteCommentButton({
  taskKey,
  commentId,
}: {
  readonly taskKey: string;
  readonly commentId: string;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteComment(taskKey, commentId);
  const changeOpen = (value: boolean) => {
    if (mutation.isPending) return;
    mutation.reset();
    setOpen(value);
  };
  return (
    <>
      <UIIconButton
        label='Удалить комментарий'
        className='text-destructive hover:bg-destructive-tint'
        onClick={() => changeOpen(true)}
      >
        <UIIcons.Trash />
      </UIIconButton>
      <UIDialog open={open} onOpenChange={changeOpen}>
        <UIDialog.Content title='Удалить комментарий?'>
          <UIDialog.Body className='flex flex-col gap-3'>
            <p className='m-0'>
              Комментарий будет удалён без возможности восстановления. Ответы
              сохранятся.
            </p>
            {mutation.error && (
              <UIAlert tone='danger'>
                {readApiError(mutation.error).message}
              </UIAlert>
            )}
          </UIDialog.Body>
          <UIDialog.Footer>
            <UIDialog.Close disabled={mutation.isPending}>
              Отмена
            </UIDialog.Close>
            <UIButton
              variant='danger'
              loading={mutation.isPending}
              onClick={() =>
                mutation.mutate(undefined, { onSuccess: () => setOpen(false) })
              }
            >
              Удалить
            </UIButton>
          </UIDialog.Footer>
        </UIDialog.Content>
      </UIDialog>
    </>
  );
}
