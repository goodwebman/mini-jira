import type { TaskComment } from '@gwmt/contracts';

export function CommentText({
  comment,
}: {
  readonly comment: Pick<TaskComment, 'mentions' | 'text'>;
}) {
  const mentions = comment.mentions ?? [];
  const parts = mentions.map((mention, index) => {
    const before = comment.text.slice(
      mentions[index - 1]?.end ?? 0,
      mention.start,
    );
    return (
      <span key={`${String(mention.start)}:${mention.userId}`}>
        {before}
        <strong className='text-primary'>
          {comment.text.slice(mention.start, mention.end)}
        </strong>
      </span>
    );
  });
  return (
    <p className='m-0 whitespace-pre-line wrap-anywhere'>
      {parts}
      {comment.text.slice(mentions.at(-1)?.end ?? 0)}
    </p>
  );
}
