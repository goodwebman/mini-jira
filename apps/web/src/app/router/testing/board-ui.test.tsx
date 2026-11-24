import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { BoardPage } from '@/pages/board';

import { signIn } from './auth-mock';
import { createBoardUiMocks, renderBoardUi } from './render-board-ui';
import { setupRouterTest, teardownRouterTest } from './router-harness';

vi.mock(
  '@/entities/auth',
  async () => (await import('./auth-mock')).authModule,
);

it('использует внедрённые зависимости для канбана', async () => {
  const api = setupRouterTest();
  try {
    signIn();
    const mocks = createBoardUiMocks(9);
    mocks.workspace.updateFilters({ query: 'вход' });
    mocks.workspace.updateFilters.mockClear();
    const user = userEvent.setup();

    renderBoardUi(<BoardPage />, mocks);

    expect(await screen.findByText('Экран входа')).toBeVisible();
    expect(screen.queryByText('График KPI')).toBeNull();
    expect(mocks.currentBoard.remember).toHaveBeenCalledWith(9);

    await user.click(screen.getByRole('button', { name: 'Разработка' }));
    expect(mocks.shell.openBoardsSwitcher).toHaveBeenCalledOnce();

    const search = screen.getByRole('searchbox', {
      name: 'Поиск по названию или ключу',
    });
    expect(search).toHaveValue('вход');
    await user.clear(search);
    expect(mocks.workspace.updateFilters).toHaveBeenCalledWith({ query: '' });
    expect(await screen.findByText('График KPI')).toBeVisible();
  } finally {
    teardownRouterTest(api);
  }
});
