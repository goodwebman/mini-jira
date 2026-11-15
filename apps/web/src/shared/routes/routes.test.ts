/** Тесткейсы: ссылки строятся и кодируются; id из адреса — только положительный int32; returnTo пропускает только локальные пути; адрес входа сохраняет место пользователя. */
import { describe, expect, it } from 'vitest';

import { ROUTES, loginRedirect, parseIdParam, safeReturnTo } from './routes';

describe('ROUTES', () => {
  it('строит ссылки', () => {
    expect(ROUTES.BOARD.build(9)).toBe('/boards/9');
    expect(ROUTES.BOARD_MEMBERS.build(9)).toBe('/boards/9/members');
    expect(ROUTES.BOARD_TASK.build(9, 'GWT-101')).toBe(
      '/boards/9/tasks/GWT-101',
    );
    expect(ROUTES.TASK.build('GWT-101')).toBe('/tasks/GWT-101');
    expect(ROUTES.TASK_COMMENT.build('GWT-101', 'c1')).toBe(
      '/tasks/GWT-101#comment-c1',
    );
    expect(ROUTES.KPI.build()).toBe('/kpi');
    expect(ROUTES.KPI.build({ boardId: 9 })).toBe('/kpi?board=9');
    expect(ROUTES.KPI.build({ boardId: 9, sprint: 14 })).toBe(
      '/kpi?board=9&sprint=14',
    );
  });
});

describe('parseIdParam', () => {
  it.each([
    ['9', 9],
    ['2147483647', 2_147_483_647],
    ['2147483648', null],
    ['0', null],
    ['-1', null],
    ['1.5', null],
    ['abc', null],
    [undefined, null],
  ])('%j → %j', (value, expected) => {
    expect(parseIdParam(value)).toBe(expected);
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/boards/42?q=1#x', '/boards/42?q=1#x'],
    [null, '/boards'],
    ['https://evil.example', '/boards'],
    ['//evil.example', '/boards'],
    ['/\\evil.example', '/boards'],
    ['/login', '/boards'],
    ['/register?x=1', '/boards'],
    ['/api/v1/auth/logout', '/boards'],
    ['/x/../login', '/boards'],
    ['/login?returnTo=/login', '/boards'],
  ])('%j → %j', (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});

describe('loginRedirect', () => {
  it('кодирует адрес и не тащит корень', () => {
    expect(
      loginRedirect({
        pathname: '/boards/1',
        search: '?q=test',
        hash: '#task',
      }),
    ).toBe('/login?returnTo=%2Fboards%2F1%3Fq%3Dtest%23task');
    expect(loginRedirect({ pathname: '/', search: '', hash: '' })).toBe(
      '/login',
    );
  });
});
