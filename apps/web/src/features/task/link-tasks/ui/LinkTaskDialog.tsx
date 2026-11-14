import { UIDialog } from '@/shared/ui';

import { LinkTaskForm } from './LinkTaskForm';

export interface ILinkTaskDialogProps {
  readonly taskKey: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** «Связать задачу с GWT-101»: тип связи, поиск по всем доступным доскам, выбор. */
export function LinkTaskDialog({
  taskKey,
  open,
  onOpenChange,
}: ILinkTaskDialogProps) {
  return (
    <UIDialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <LinkTaskForm taskKey={taskKey} onDone={() => onOpenChange(false)} />
      )}
    </UIDialog>
  );
}
