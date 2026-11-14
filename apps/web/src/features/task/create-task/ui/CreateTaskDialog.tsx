import { UIDialog } from '@/shared/ui';

import { CreateTaskForm, type ICreateTaskFormProps } from './CreateTaskForm';

export interface ICreateTaskDialogProps extends Omit<
  ICreateTaskFormProps,
  'onDone'
> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  ...props
}: ICreateTaskDialogProps) {
  return (
    <UIDialog open={open} onOpenChange={onOpenChange}>
      {/* Форма монтируется заново при каждом открытии: черновик всегда чистый */}
      {open && <CreateTaskForm {...props} onDone={() => onOpenChange(false)} />}
    </UIDialog>
  );
}
