/**
 * Тесткейсы: начальное состояние, колонка и фокус, повторный фокус не будит;
 * хук отдаёт плоский объект; провайдер создаёт стор один раз; без провайдера — ошибка.
 */
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardWorkspaceProvider } from '../ui/BoardWorkspaceProvider';
import { useBoardWorkspace } from './board-workspace.di';
import {
  INITIAL_WORKSPACE,
  createBoardWorkspaceStore,
} from './board-workspace.store';

const createStore = () => createBoardWorkspaceStore({ boardId: 9 });

describe('createBoardWorkspaceStore', () => {
  it('стартует с колонки «В работе» и без подсвеченной задачи', () => {
    expect(createStore().getSnapshot()).toEqual(INITIAL_WORKSPACE);
  });

  it('экшены меняют колонку и фокус', () => {
    const store = createStore();
    store.selectPhoneColumn('done');
    store.focusTask('GWT-1');
    expect(store.getSnapshot()).toEqual({
      phoneColumn: 'done',
      focusedTaskKey: 'GWT-1',
    });
  });

  it('повторный фокус той же задачи не будит подписчиков', () => {
    const store = createStore();
    store.focusTask('GWT-1');
    const listener = vi.fn();
    store.subscribe(listener);
    store.focusTask('GWT-1');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('useBoardWorkspace', () => {
  it('отдаёт состояние и экшены одного стора', () => {
    const store = createStore();
    const { result } = renderHook(() => useBoardWorkspace(), {
      wrapper: ({ children }) => (
        <BoardWorkspaceProvider createStore={() => store}>
          {children}
        </BoardWorkspaceProvider>
      ),
    });
    expect(result.current.boardId).toBe(9);
    act(() => result.current.selectPhoneColumn('done'));
    expect(result.current.phoneColumn).toBe('done');
    expect(store.getSnapshot().phoneColumn).toBe('done');
  });

  it('провайдер создаёт стор один раз за жизнь', () => {
    const create = vi.fn(createStore);
    const { rerender } = render(
      <BoardWorkspaceProvider createStore={create}>
        <span>доска</span>
      </BoardWorkspaceProvider>,
    );
    rerender(
      <BoardWorkspaceProvider createStore={create}>
        <span>доска</span>
      </BoardWorkspaceProvider>,
    );
    expect(screen.getByText('доска')).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('без провайдера падает с именем скоупа', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBoardWorkspace())).toThrow(
      /BoardWorkspace не найден/,
    );
  });
});
