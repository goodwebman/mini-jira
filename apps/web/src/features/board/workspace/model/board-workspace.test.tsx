/**
 * Тесткейсы: начальное состояние; экшены фильтров, колонки и фокуса; повторный фокус не будит;
 * фильтр по людям — пересечение с текущими участниками (удалённый или ставший гостем не остаётся
 * невидимым фильтром); хук отдаёт плоский объект; провайдер создаёт стор один раз; без провайдера — ошибка.
 */
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardWorkspaceProvider } from '../ui/BoardWorkspaceProvider';
import { useBoardWorkspace } from './board-workspace.di';
import {
  INITIAL_WORKSPACE,
  createBoardWorkspaceStore,
  effectiveFilters,
} from './board-workspace.store';

const createStore = () => createBoardWorkspaceStore({ boardId: 9 });

describe('createBoardWorkspaceStore', () => {
  it('стартует с пустых фильтров и колонки «В работе»', () => {
    expect(createStore().getSnapshot()).toEqual(INITIAL_WORKSPACE);
  });

  it('экшены меняют фильтры, колонку и фокус', () => {
    const store = createStore();
    store.setQuery('kpi');
    store.setPriority('crit');
    store.toggleAssignee('u1');
    store.toggleAssignee('u2');
    store.toggleAssignee('u1');
    store.selectPhoneColumn('done');
    store.focusTask('GWT-1');
    expect(store.getSnapshot()).toEqual({
      filters: { query: 'kpi', priority: 'crit', assigneeIds: ['u2'] },
      phoneColumn: 'done',
      focusedTaskKey: 'GWT-1',
    });
    store.clearAssignees();
    expect(store.getSnapshot().filters.assigneeIds).toEqual([]);
    store.resetFilters();
    expect(store.getSnapshot().filters).toEqual(INITIAL_WORKSPACE.filters);
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

describe('effectiveFilters', () => {
  const filters = {
    query: '',
    priority: 'all',
    assigneeIds: ['u1', 'u2'],
  } as const;

  it('оставляет только тех, кого на доске можно выбрать', () => {
    expect(effectiveFilters(filters, ['u2', 'u3']).assigneeIds).toEqual(['u2']);
    expect(effectiveFilters(filters, []).assigneeIds).toEqual([]);
  });

  it('без изменений возвращает тот же объект: мемоизация ниже не сбрасывается', () => {
    expect(effectiveFilters(filters, ['u1', 'u2', 'u3'])).toBe(filters);
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
    act(() => result.current.setQuery('kpi'));
    expect(result.current.filters.query).toBe('kpi');
    expect(store.getSnapshot().filters.query).toBe('kpi');
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
