/**
 * Тесткейсы: начальное состояние, колонка и фокус, повторный фокус не будит;
 * хук отдаёт плоский объект; провайдер создаёт стор один раз; без провайдера — ошибка.
 */
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createStoragePersistence } from '@/shared/lib/store';

import { BoardWorkspaceProvider } from '../ui/BoardWorkspaceProvider';
import { useBoardWorkspace } from './board-workspace.di';
import {
  INITIAL_WORKSPACE,
  createBoardWorkspaceStore,
} from './board-workspace.store';
import { parseStoredBoardFilters } from './stored-board-filters';

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
      ...INITIAL_WORKSPACE,
      phoneColumn: 'done',
      focusedTaskKey: 'GWT-1',
    });
  });

  it('восстанавливает 200 исполнителей и сохраняет только фильтры', () => {
    const key = 'board-workspace-test';
    const create = () =>
      createBoardWorkspaceStore({
        boardId: 9,
        filterPersistence: createStoragePersistence(
          localStorage,
          key,
          parseStoredBoardFilters,
        ),
      });
    const assigneeIds = Array.from({ length: 200 }, () => crypto.randomUUID());
    const store = create();
    store.updateFilters({ assigneeIds });
    store.updateFilters({ query: 'Экран', priority: 'high' });
    store.selectPhoneColumn('done');
    store.focusTask('GWT-1');

    const reloaded = create();
    expect(reloaded.getSnapshot()).toEqual({
      ...INITIAL_WORKSPACE,
      filters: { query: 'Экран', priority: 'high', assigneeIds },
    });
    reloaded.updateFilters(INITIAL_WORKSPACE.filters);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('отклоняет сохранённые фильтры с некорректными данными', () => {
    expect(
      parseStoredBoardFilters({
        query: '',
        priority: 'high',
        assigneeIds: [1],
      }),
    ).toBeNull();
    expect(
      parseStoredBoardFilters({
        query: '',
        priority: 'unknown',
        assigneeIds: [],
      }),
    ).toBeNull();
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
