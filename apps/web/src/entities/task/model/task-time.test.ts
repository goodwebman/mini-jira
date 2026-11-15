import type { TaskTimeInterval } from '@gwmt/contracts';
import { describe, expect, it } from 'vitest';

import { makeTask, users } from '@/shared/lib/testing';

import { SP_SECONDS, getTaskIntervalTime, getTaskSpentSec } from './task-time';

const start = '2026-11-16T06:00:00Z';
const at = (seconds: number) => Date.parse(start) + seconds * 1000;
const timer = {
  ...makeTask().timer,
  spentSec: 3600,
  statusEnteredAt: start,
  pausedTotalSec: 300,
};
const interval: TaskTimeInterval = {
  id: 'i',
  status: 'work',
  enteredAt: start,
  leftAt: null,
  pausedSec: 300,
  pauses: [],
  changedBy: users.anna,
};

describe('время задачи', () => {
  it('суммирует прошлые интервалы и текущую работу; SP сравнивает с часами строго выше оценки', () => {
    expect(SP_SECONDS).toBe(3600);
    expect(getTaskSpentSec('work', timer, at(900))).toBe(4200);
    expect(getTaskSpentSec('review', timer, at(900))).toBe(4200);
    expect(getTaskSpentSec('test', timer, at(900))).toBe(4200);
    expect(getTaskSpentSec('todo', timer, at(900))).toBe(3600);
    expect(getTaskSpentSec('done', timer, at(86_400))).toBe(3600);
    expect(
      getTaskSpentSec(
        'work',
        { ...timer, pausedTotalSec: 0, spentSec: 0 },
        at(3600),
      ) > SP_SECONDS,
    ).toBe(false);
    expect(
      getTaskSpentSec(
        'work',
        { ...timer, pausedTotalSec: 0, spentSec: 0 },
        at(3601),
      ) > SP_SECONDS,
    ).toBe(true);
  });

  it('останавливает чистое время на паузе, включая несколько прежних пауз', () => {
    expect(
      getTaskSpentSec(
        'work',
        { ...timer, pausedAt: new Date(at(900)).toISOString() },
        at(3600),
      ),
    ).toBe(4200);
    expect(
      getTaskIntervalTime(interval, new Date(at(900)).toISOString(), at(1200)),
    ).toEqual({ elapsedSec: 1200, pausedSec: 600, activeSec: 600 });
  });

  it('закрытые интервалы не растут; ожидание не становится работой', () => {
    expect(
      getTaskIntervalTime(
        { ...interval, leftAt: new Date(at(900)).toISOString() },
        null,
        at(86_400),
      ),
    ).toEqual({ elapsedSec: 900, pausedSec: 300, activeSec: 600 });
    expect(
      getTaskIntervalTime(
        { ...interval, status: 'todo', pausedSec: 0 },
        null,
        at(900),
      ).activeSec,
    ).toBe(0);
    expect(getTaskSpentSec('work', timer, at(-1))).toBe(3600);
  });
});
