import { UIDialog } from '@/shared/ui';

import type { KpiSelection } from '../model/selection';
import { PickerForm } from './SprintPickerForm';

export interface IKpiSprintPickerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly value: KpiSelection;
  readonly onSubmit: (selection: KpiSelection) => void;
}

/** «Доска и спринт»: последние 8 спринтов выбранной доски с прогрессом. */
export function KpiSprintPickerDialog({
  open,
  onOpenChange,
  value,
  onSubmit,
}: IKpiSprintPickerDialogProps) {
  return (
    <UIDialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <PickerForm
          initial={value}
          onSubmit={(selection) => {
            onSubmit(selection);
            onOpenChange(false);
          }}
        />
      )}
    </UIDialog>
  );
}
