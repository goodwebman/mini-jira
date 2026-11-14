import type { ReactNode } from 'react';

import type { TaskComment } from '@gwmt/contracts';

import { formatShortDateTime } from '@/shared/lib/format';

export interface ICommentItemProps {
  readonly comment: TaskComment;
  /** Аватар автора: его собирает слой выше из сущности пользователя. */
  readonly avatar: ReactNode;
  /** Пояс пользователя: в нём показывается время комментария. */
  readonly timeZone?: string;
}

/** Комментарий: автор, время и текст с сохранёнными переносами строк. */
export function CommentItem({ comment, avatar, timeZone }: ICommentItemProps) {
  return (
    <article className='flex gap-2'>
      {avatar}
      <div className='flex min-w-0 flex-col gap-0.5'>
        <div className='text-small'>
          <strong className='font-semibold'>{comment.author.name}</strong>{' '}
          <time dateTime={comment.createdAt} className='text-muted-foreground'>
            {formatShortDateTime(comment.createdAt, timeZone)}
          </time>
        </div>
        <p className='m-0 whitespace-pre-line wrap-anywhere'>{comment.text}</p>
      </div>
    </article>
  );
}
