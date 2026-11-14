import { AppShellLayout } from '@/widgets/app-shell';
import { BoardList } from '@/widgets/board-list';

/** Каркас и список досок в его панели собираются здесь: виджеты не знают друг о друге. */
export function AppShellRoute() {
  return (
    <AppShellLayout
      renderBoardsPanel={({ close }) => (
        <BoardList variant='panel' onNavigate={close} />
      )}
    />
  );
}
