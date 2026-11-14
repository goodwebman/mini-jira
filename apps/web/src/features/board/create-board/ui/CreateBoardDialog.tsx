import type { UserBrief } from '@gwmt/contracts';

import { UIDialog } from '@/shared/ui';

import { CreateBoardForm } from './CreateBoardForm';

export interface ICreateBoardDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Создатель: показан в участниках закреплённым, станет администратором. */
  readonly currentUser: Pick<UserBrief, 'colorIndex' | 'id' | 'name'>;
}

export function CreateBoardDialog({
  open,
  onOpenChange,
  currentUser,
}: ICreateBoardDialogProps) {
  return (
    <UIDialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateBoardForm
          currentUser={currentUser}
          onDone={() => onOpenChange(false)}
        />
      )}
    </UIDialog>
  );
}
