import { useState } from 'react';

import type { TaskDetail } from '@gwmt/contracts';

import { UIButton, UIDialog, UIIcons } from '@/shared/ui';

import { EditTaskForm } from './EditTaskForm';

export function EditTaskButton({ task }: { readonly task: TaskDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <UIButton variant='secondary' onClick={() => setOpen(true)}>
        <UIIcons.Pencil />
        Редактировать задачу
      </UIButton>
      <UIDialog open={open} onOpenChange={setOpen}>
        {open && <EditTaskForm task={task} onDone={() => setOpen(false)} />}
      </UIDialog>
    </>
  );
}
