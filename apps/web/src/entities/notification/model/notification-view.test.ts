import type { Notification } from '@gwmt/contracts';
import { describe, expect, it } from 'vitest';

import { notificationTarget, notificationText } from './notification-view';

const base: Notification = {
  id: '00000000-0000-4000-8000-000000000001',
  type: 'board_member_added',
  boardId: 9,
  boardName: 'Команда',
  createdAt: '2026-11-16T09:00:00Z',
  readAt: null,
};

describe('notification display and links', () => {
  it('supports existing invitations and new event messages', () => {
    expect(notificationText(base)).toBe('Вас добавили на доску «Команда»');
    expect(notificationTarget(base)).toBe('/boards/9');
    expect(
      notificationText({
        ...base,
        type: 'task_review_rejected',
        message: 'Задача не прошла ревью',
      }),
    ).toBe('Задача не прошла ревью');
  });
  it('opens the exact task/comment and does not offer a removed board', () => {
    expect(
      notificationTarget({
        ...base,
        type: 'task_test_failed',
        taskKey: 'GWT-101',
      }),
    ).toBe('/tasks/GWT-101');
    expect(
      notificationTarget({
        ...base,
        type: 'comment_mention',
        taskKey: 'GWT-101',
        commentId: base.id,
      }),
    ).toBe(`/tasks/GWT-101#comment-${base.id}`);
    expect(
      notificationTarget({ ...base, type: 'board_member_removed' }),
    ).toBeNull();
  });
});
