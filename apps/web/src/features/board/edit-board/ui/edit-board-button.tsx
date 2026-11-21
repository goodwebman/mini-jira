import { useState } from 'react';

import type { BoardDetail } from '@/entities/board';
import { UIDialog, UIIconButton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { EditBoardForm } from './edit-board-form';

export function EditBoardButton({
  board,
}: {
  readonly board: Pick<BoardDetail, 'description' | 'id' | 'name'>;
}) {
  const [editing, setEditing] = useState<null | typeof board>(null);
  const close = () => setEditing(null);

  return (
    <>
      <UIIconButton
        label='Редактировать доску'
        aria-haspopup='dialog'
        onClick={() => setEditing(board)}
      >
        <UIIcons.Pencil />
      </UIIconButton>
      <UIDialog open={editing !== null} onOpenChange={close}>
        {editing && <EditBoardForm board={editing} onDone={close} />}
      </UIDialog>
    </>
  );
}
