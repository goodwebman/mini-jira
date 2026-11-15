import type { TaskComment } from '@gwmt/contracts';
import { describe, expect, it } from 'vitest';

import { users } from '@/shared/lib/testing';

import { buildCommentThread } from './comment-thread';

const comment = (id: string, parentId: null | string = null): TaskComment => ({
  id,
  parentId,
  author: users.anna,
  text: id,
  createdAt: '2026-11-11T00:00:00Z',
});

describe('buildCommentThread', () => {
  it('группирует ответы под родителями, сохраняя порядок соседей', () => {
    expect(
      buildCommentThread([
        comment('first'),
        comment('second'),
        comment('reply', 'first'),
        comment('nested', 'reply'),
        comment('sibling', 'first'),
      ]).map(({ comment: item, depth }) => [item.id, depth]),
    ).toEqual([
      ['first', 0],
      ['reply', 1],
      ['nested', 2],
      ['sibling', 1],
      ['second', 0],
    ]);
  });

  it('не зависит от порядка родителей во входных данных', () => {
    expect(
      buildCommentThread([comment('reply', 'root'), comment('root')]).map(
        ({ comment: item }) => item.id,
      ),
    ).toEqual(['root', 'reply']);
    expect(buildCommentThread([comment('orphan', 'missing')])).toEqual([
      { comment: comment('orphan', 'missing'), depth: 0 },
    ]);
    expect(buildCommentThread([])).toEqual([]);
  });

  it('обходит 20000 уровней без рекурсии', () => {
    const comments = Array.from({ length: 20_000 }, (_, index) =>
      comment(String(index), index === 0 ? null : String(index - 1)),
    );
    const thread = buildCommentThread(comments);
    expect(thread).toHaveLength(comments.length);
    expect(thread.at(-1)?.depth).toBe(19_999);
  });
});
