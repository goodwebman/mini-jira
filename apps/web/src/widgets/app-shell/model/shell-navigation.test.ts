/** Тесткейсы: активный раздел меню по адресу; задача по постоянной ссылке относится к доскам. */
import { describe, expect, it } from 'vitest';

import { sectionOf } from './use-shell-navigation';

describe('sectionOf', () => {
  it.each([
    ['/boards', 'boards'],
    ['/boards/9/tasks/GWT-1', 'boards'],
    ['/tasks/GWT-1', 'boards'],
    ['/my-tasks', 'tasks'],
    ['/kpi', 'kpi'],
    ['/profile', 'profile'],
    ['/unknown', null],
  ])('%s → %s', (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });
});
