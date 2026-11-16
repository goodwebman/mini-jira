import type { CommentMention } from '@gwmt/contracts';

/** Mentions survive edits outside their text; editing the name removes the tag. */
export function editCommentMentions(
  previous: string,
  next: string,
  mentions: CommentMention[],
): CommentMention[] {
  let start = 0;
  while (
    start < previous.length &&
    start < next.length &&
    previous[start] === next[start]
  )
    start += 1;
  let suffix = 0;
  while (
    suffix < previous.length - start &&
    suffix < next.length - start &&
    previous[previous.length - suffix - 1] === next[next.length - suffix - 1]
  )
    suffix += 1;
  const end = previous.length - suffix;
  const delta = next.length - previous.length;
  return mentions.flatMap((mention) => {
    if (mention.end <= start) return [mention];
    if (mention.start >= end)
      return [
        { ...mention, start: mention.start + delta, end: mention.end + delta },
      ];
    return [];
  });
}

export function commentMentionQuery(text: string, caret: number) {
  const match = /(?:^|\s)@([^\s@]*)$/u.exec(text.slice(0, caret));
  return match
    ? { start: caret - match[1]!.length - 1, end: caret, query: match[1]! }
    : null;
}

export function prepareCommentText(text: string, mentions: CommentMention[]) {
  const leading = text.length - text.trimStart().length;
  return {
    text: text.trim(),
    ...(mentions.length > 0
      ? {
          mentions: mentions.map((mention) => ({
            ...mention,
            start: mention.start - leading,
            end: mention.end - leading,
          })),
        }
      : {}),
  };
}
