import { useState } from 'react';

import type { TaskDetail } from '@gwmt/contracts';

import { UIButton, UIDialog } from '@/shared/ui';

import { EditTaskForm } from './EditTaskForm';

export function EditTaskButton({ task }: { readonly task: TaskDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <UIButton variant='secondary' size='sm' onClick={() => setOpen(true)}>
        Редактировать задачу
      </UIButton>
      <UIDialog open={open} onOpenChange={setOpen}>
        {open && <EditTaskForm task={task} onDone={() => setOpen(false)} />}
      </UIDialog>
    </>
  );
}
