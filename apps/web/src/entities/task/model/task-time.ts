import type { TaskStatus, TaskTimeInterval, TaskTimer } from '@gwmt/contracts';

export const SP_SECONDS = 3600;
export const isActiveTaskStatus = (status: TaskStatus) =>
  status === 'work' || status === 'review' || status === 'test';

export function getTaskSpentSec(
  status: TaskStatus,
  timer: TaskTimer,
  now: number,
) {
  const end = timer.pausedAt ? Date.parse(timer.pausedAt) : now;
  return (
    timer.spentSec +
    (isActiveTaskStatus(status)
      ? Math.max(
          0,
          Math.floor((end - Date.parse(timer.statusEnteredAt)) / 1000) -
            timer.pausedTotalSec,
        )
      : 0)
  );
}

export function getTaskIntervalTime(
  interval: TaskTimeInterval,
  pausedAt: null | string,
  now: number,
) {
  const end = interval.leftAt ? Date.parse(interval.leftAt) : now;
  const elapsedSec = Math.max(
    0,
    Math.floor((end - Date.parse(interval.enteredAt)) / 1000),
  );
  const pendingPause =
    !interval.leftAt && pausedAt
      ? Math.max(0, Math.floor((now - Date.parse(pausedAt)) / 1000))
      : 0;
  const pausedSec = Math.min(elapsedSec, interval.pausedSec + pendingPause);
  return {
    elapsedSec,
    pausedSec,
    activeSec: isActiveTaskStatus(interval.status) ? elapsedSec - pausedSec : 0,
  };
}
