import { useState } from 'react';

import { readApiError } from '@/shared/api';
import { UIAlert, UIButton, UIDialog, useToast } from '@/shared/ui';

import { useDeleteTask } from '../model/use-delete-task';

export function DeleteTaskButton({
  boardId,
  taskKey,
  onDeleted,
}: {
  readonly boardId: number;
  readonly taskKey: string;
  readonly onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteTask(boardId, taskKey);
  const { toast } = useToast();
  const changeOpen = (value: boolean) => {
    if (mutation.isPending) return;
    mutation.reset();
    setOpen(value);
  };
  return (
    <>
      <UIButton variant='danger' size='sm' onClick={() => changeOpen(true)}>
        Удалить задачу
      </UIButton>
      <UIDialog open={open} onOpenChange={changeOpen}>
        <UIDialog.Content title={`Удалить задачу ${taskKey}?`}>
          <UIDialog.Body className='flex flex-col gap-3'>
            <p className='m-0'>
              Задача, комментарии, связи и история времени будут удалены без
              возможности восстановления.
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
                mutation.mutate(undefined, {
                  onSuccess: () => {
                    setOpen(false);
                    toast(`Задача ${taskKey} удалена`);
                    onDeleted();
                  },
                })
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
