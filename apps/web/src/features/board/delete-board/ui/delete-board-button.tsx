import { useId, useState } from 'react';

import type { BoardDetail } from '@/entities/board';
import { readApiError } from '@/shared/api';
import {
  UIAlert,
  UIButton,
  UIDialog,
  UIIconButton,
  useToast,
} from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { useDeleteBoard } from '../model/use-delete-board';

export function DeleteBoardButton({
  board,
  onDeleted,
}: {
  readonly board: Pick<BoardDetail, 'id' | 'key' | 'name'>;
  readonly onDeleted: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  const { toast } = useToast();
  const mutation = useDeleteBoard(board, () => {
    toast(`Доска «${board.name}» удалена`);
    return onDeleted();
  });
  const changeOpen = (value: boolean) => {
    if (mutation.isPending) return;
    mutation.reset();
    setOpen(value);
  };

  return (
    <>
      <UIIconButton
        label='Удалить доску'
        aria-haspopup='dialog'
        onClick={() => changeOpen(true)}
      >
        <UIIcons.Trash />
      </UIIconButton>
      <UIDialog open={open} onOpenChange={changeOpen}>
        <UIDialog.Content
          title='Удалить доску?'
          aria-describedby={descriptionId}
        >
          <UIDialog.Body className='flex flex-col gap-4'>
            <p id={descriptionId} className='m-0 wrap-anywhere'>
              Доска «<strong>{board.name}</strong>», её задачи, спринты,
              комментарии и история времени будут удалены без возможности
              восстановления.
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
              onClick={() => mutation.mutate()}
            >
              Удалить
            </UIButton>
          </UIDialog.Footer>
        </UIDialog.Content>
      </UIDialog>
    </>
  );
}
