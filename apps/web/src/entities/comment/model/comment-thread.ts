import type { TaskComment } from '@gwmt/contracts';

/** Итеративный обход: глубина обсуждения не ограничена стеком вызовов. */
export function buildCommentThread(comments: readonly TaskComment[]) {
  const ids = new Set(comments.map((comment) => comment.id));
  const children = new Map<null | string, TaskComment[]>();
  for (const comment of comments) {
    const parentId =
      comment.parentId && ids.has(comment.parentId) ? comment.parentId : null;
    const siblings = children.get(parentId) ?? [];
    siblings.push(comment);
    children.set(parentId, siblings);
  }
  const result: { comment: TaskComment; depth: number }[] = [];
  const stack = (children.get(null) ?? [])
    .toReversed()
    .map((comment) => ({ comment, depth: 0 }));
  while (stack.length > 0) {
    const entry = stack.pop()!;
    result.push(entry);
    const replies = children.get(entry.comment.id) ?? [];
    for (let index = replies.length - 1; index >= 0; index -= 1) {
      stack.push({ comment: replies[index]!, depth: entry.depth + 1 });
    }
  }
  return result;
}
