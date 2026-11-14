/** Тесткейсы: фильтры читаются из адреса, мусор становится значениями по умолчанию; запись опускает значения по умолчанию и сбрасывает страницу при новом фильтре. */
import { describe, expect, it } from 'vitest';

import { readMyTasksParams, writeMyTasksParams } from './my-tasks-params';

describe('параметры «Моих задач»', () => {
  it('читает адрес и чинит мусор', () => {
    expect(
      readMyTasksParams(
        new URLSearchParams('q=kpi&status=work&role=tester&page=3'),
      ),
    ).toEqual({
      q: 'kpi',
      status: 'work',
      role: 'tester',
      page: 3,
    });
    expect(
      readMyTasksParams(new URLSearchParams('status=later&role=boss&page=-1')),
    ).toEqual({
      q: '',
      status: 'all',
      role: 'all',
      page: 1,
    });
  });

  it('новый фильтр сбрасывает страницу, значения по умолчанию не попадают в адрес', () => {
    const current = { q: 'kpi', status: 'work', role: 'all', page: 4 } as const;
    expect(writeMyTasksParams(current, { status: 'all' }).toString()).toBe(
      'q=kpi',
    );
    expect(writeMyTasksParams(current, { page: 5 }).toString()).toBe(
      'q=kpi&status=work&page=5',
    );
  });
});
