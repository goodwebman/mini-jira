import { describe, expect, it } from 'vitest';

import { EMPTY_TASK_FILTERS } from '@/entities/task';

import { readBoardFilters, writeBoardFilters } from './board-filter-params';

describe('фильтры доски в URL', () => {
  it('пустой адрес и неизвестный приоритет дают значения по умолчанию', () => {
    expect(readBoardFilters(new URLSearchParams())).toEqual(EMPTY_TASK_FILTERS);
    expect(
      readBoardFilters(new URLSearchParams('priority=unknown&assignee=')),
    ).toEqual(EMPTY_TASK_FILTERS);
  });

  it('читает поиск, приоритет и нескольких участников без дублей', () => {
    expect(
      readBoardFilters(
        new URLSearchParams(
          'q=Экран+входа&priority=crit&assignee=u1&assignee=u2&assignee=u1',
        ),
      ),
    ).toEqual({
      query: 'Экран входа',
      priority: 'crit',
      assigneeIds: ['u1', 'u2'],
    });
  });

  it('кодирует специальные символы и сохраняет остальные фильтры и параметры', () => {
    const original = new URLSearchParams(
      'priority=high&assignee=u1&view=compact',
    );
    const updated = writeBoardFilters(original, { query: 'Привет & # / ?' });
    expect(readBoardFilters(new URLSearchParams(updated.toString()))).toEqual({
      query: 'Привет & # / ?',
      priority: 'high',
      assigneeIds: ['u1'],
    });
    expect(updated.get('view')).toBe('compact');
    expect(original.has('q')).toBe(false);
  });

  it('удаляет сброшенные фильтры из URL, не затрагивая другие параметры', () => {
    const updated = writeBoardFilters(
      new URLSearchParams(
        'q=test&priority=crit&assignee=u1&assignee=u2&view=compact',
      ),
      EMPTY_TASK_FILTERS,
    );
    expect(updated.toString()).toBe('view=compact');
  });
});
