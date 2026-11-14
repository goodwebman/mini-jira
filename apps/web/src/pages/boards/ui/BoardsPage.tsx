import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSessionUser } from '@/entities/auth';
import { BOARD_FORMS, boardsQueryOptions } from '@/entities/board';
import { CreateBoardDialog } from '@/features/board/create-board';
import { countLabel } from '@/shared/lib/format';
import { UIPageHeader } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { ShellPage } from '@/widgets/app-shell';
import { BoardList } from '@/widgets/board-list';

/** Выбор доски: список с поиском и избранным, создание новой. */
export function BoardsPage() {
  const user = useSessionUser();
  const [creating, setCreating] = useState(false);
  // Тот же ключ, что у списка без фильтров: запрос один
  const all = useQuery(boardsQueryOptions());

  return (
    <ShellPage
      title='Доски'
      caption={all.data ? countLabel(all.data.total, BOARD_FORMS) : ' '}
      actions={
        <UIPageHeader.Action
          icon={<UIIcons.Plus />}
          label='Создать доску'
          onClick={() => setCreating(true)}
        />
      }
    >
      <div className='mx-auto w-full max-w-[880px] xl:max-w-[1200px]'>
        <BoardList variant='page' />
      </div>
      <CreateBoardDialog
        open={creating}
        onOpenChange={setCreating}
        currentUser={user}
      />
    </ShellPage>
  );
}
