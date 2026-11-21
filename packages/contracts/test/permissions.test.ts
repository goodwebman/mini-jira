import { describe, expect, it } from 'vitest';

import {
  type BoardAction,
  type BoardRole,
  type MoveTask,
  TASK_STATUSES,
  type TaskStatus,
  allowedStatuses,
  can,
  createStatusError,
  getCommentPermissions,
  statusMoveError,
} from '../src/index.js';

const REVIEWER = 'reviewer-id';
const TESTER = 'tester-id';
const OTHER = 'other-id';
const AUTHOR = 'author-id';
const DESIGNER = 'designer-id';

const task = (status: TaskStatus, isTakeLocked = false): MoveTask => ({
  status,
  isTakeLocked,
  authorId: AUTHOR,
  reviewerId: REVIEWER,
  testerId: TESTER,
  designerId: DESIGNER,
});

const worker = (id = AUTHOR) => ({ id, role: 'worker' as const });

describe('can', () => {
  const table: [BoardAction, boolean, boolean][] = [
    ['board.manage', true, false],
    ['members.manage', true, false],
    ['task.create', true, true],
    ['task.delete', true, false],
    ['task.edit', true, false],
    ['task.lock', true, false],
    ['task.pause', true, true],
    ['task.comment', true, true],
    ['task.link', true, true],
  ];

  it.each(table)('%s', (action, admin, workerAllowed) => {
    expect(can('admin', action)).toBe(admin);
    expect(can('worker', action)).toBe(workerAllowed);
    expect(can('guest', action)).toBe(false);
  });
});

describe('права на комментарий', () => {
  it.each([
    ['admin', true, true, true],
    ['admin', false, false, true],
    ['worker', true, true, true],
    ['worker', false, false, false],
    ['guest', true, false, false],
    ['guest', false, false, false],
  ] as const)('%s, свой: %s', (role, own, canEdit, canDelete) => {
    expect(getCommentPermissions(role, AUTHOR, own ? AUTHOR : OTHER)).toEqual({
      canEdit,
      canDelete,
    });
  });
});

describe('statusMoveError', () => {
  it('администратор двигает задачу куда угодно, даже под запретом', () => {
    const admin = { id: OTHER, role: 'admin' as const };
    expect(statusMoveError(admin, task('done'), 'todo')).toBeNull();
    expect(statusMoveError(admin, task('todo', true), 'work')).toBeNull();
  });

  it('гость не двигает ничего, даже будучи ревьювером', () => {
    const guest = { id: REVIEWER, role: 'guest' as const };
    expect(statusMoveError(guest, task('review'), 'work')).toBe(
      'ROLE_FORBIDDEN',
    );
    expect(statusMoveError(guest, task('todo'), 'work')).toBe('ROLE_FORBIDDEN');
  });

  it('рабочий двигает вперёд и может перепрыгивать этапы', () => {
    expect(statusMoveError(worker(), task('todo'), 'work')).toBeNull();
    expect(statusMoveError(worker(), task('todo'), 'done')).toBeNull();
    expect(statusMoveError(worker(), task('review'), 'done')).toBeNull();
  });

  it('шаг назад без назначения на задачу запрещён', () => {
    expect(statusMoveError(worker(), task('work'), 'todo')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
    expect(statusMoveError(worker(), task('review'), 'work')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
  });

  it.each([AUTHOR, REVIEWER, TESTER, DESIGNER])(
    'назначенный участник %s двигает свою задачу вперёд',
    (id) => {
      expect(statusMoveError(worker(id), task('todo'), 'work')).toBeNull();
    },
  );

  it.each(TASK_STATUSES)(
    'посторонний рабочий не меняет статус %s',
    (status) => {
      for (const to of TASK_STATUSES) {
        if (to === status) continue;
        expect(statusMoveError(worker(OTHER), task(status), to)).toBe(
          'STATUS_MOVE_FORBIDDEN',
        );
      }
      expect(allowedStatuses(worker(OTHER), task(status))).toEqual([status]);
    },
  );

  it('ревьювер возвращает только из review в work', () => {
    expect(
      statusMoveError(worker(REVIEWER), task('review'), 'work'),
    ).toBeNull();
    expect(statusMoveError(worker(REVIEWER), task('review'), 'todo')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
    expect(statusMoveError(worker(REVIEWER), task('test'), 'review')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
    expect(statusMoveError(worker(REVIEWER), task('test'), 'work')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
  });

  it('тестировщик возвращает из test в review или work', () => {
    expect(statusMoveError(worker(TESTER), task('test'), 'review')).toBeNull();
    expect(statusMoveError(worker(TESTER), task('test'), 'work')).toBeNull();
    expect(statusMoveError(worker(TESTER), task('test'), 'todo')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
    expect(statusMoveError(worker(TESTER), task('done'), 'test')).toBe(
      'STATUS_MOVE_FORBIDDEN',
    );
  });

  it('под запретом рабочий не выводит задачу из todo никуда', () => {
    for (const to of ['work', 'review', 'test', 'done'] as const) {
      expect(statusMoveError(worker(), task('todo', true), to)).toBe(
        'TASK_TAKE_LOCKED',
      );
    }
  });

  it('тот же статус не ошибка для рабочего', () => {
    expect(statusMoveError(worker(), task('todo', true), 'todo')).toBeNull();
    expect(statusMoveError(worker(), task('done'), 'done')).toBeNull();
  });
});

describe('allowedStatuses', () => {
  const allowed = (role: BoardRole, id: string, t: MoveTask) =>
    allowedStatuses({ id, role }, t);

  it('текущий статус входит в список у всех ролей', () => {
    expect(allowed('guest', OTHER, task('review'))).toEqual(['review']);
    expect(allowed('worker', OTHER, task('todo', true))).toEqual(['todo']);
    expect(allowed('worker', OTHER, task('done'))).toEqual(['done']);
  });

  it('ревьювер видит шаг назад, посторонний нет', () => {
    expect(allowed('worker', REVIEWER, task('review'))).toEqual([
      'work',
      'review',
      'test',
      'done',
    ]);
    expect(allowed('worker', OTHER, task('review'))).toEqual(['review']);
  });

  it('администратор видит все статусы', () => {
    expect(allowed('admin', OTHER, task('done'))).toEqual([
      'todo',
      'work',
      'review',
      'test',
      'done',
    ]);
  });
});

describe('createStatusError', () => {
  it('администратор создаёт в любом статусе', () => {
    expect(createStatusError('admin', 'review')).toBeNull();
  });

  it('рабочий создаёт только в todo', () => {
    expect(createStatusError('worker', 'todo')).toBeNull();
    expect(createStatusError('worker', 'work')).toBe('STATUS_MOVE_FORBIDDEN');
  });

  it('гость не создаёт', () => {
    expect(createStatusError('guest', 'todo')).toBe('ROLE_FORBIDDEN');
  });
});
