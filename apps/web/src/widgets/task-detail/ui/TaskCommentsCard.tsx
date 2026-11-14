import type { TaskDetail } from '@gwmt/contracts';

import { CommentItem } from '@/entities/comment';
import { UserAvatar } from '@/entities/user';
import { AddCommentForm } from '@/features/comment/add-comment';
import { UICard, UIEmptyState } from '@/shared/ui';

/** Комментарии задачи: лента и форма нового — если роль позволяет. */
export function TaskCommentsCard({
  task,
  canComment,
  timeZone,
}: {
  readonly task: Pick<TaskDetail, 'comments' | 'key'>;
  readonly canComment: boolean;
  readonly timeZone: string;
}) {
  return (
    <UICard padding='lg' className='flex flex-col gap-3'>
      <UICard.Title as='h3' size='sm'>
        Комментарии · {task.comments.length}
      </UICard.Title>
      {task.comments.length === 0 && !canComment && (
        <UIEmptyState title='Комментариев пока нет' />
      )}
      {task.comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          timeZone={timeZone}
          avatar={<UserAvatar user={comment.author} size='md' />}
        />
      ))}
      {canComment && <AddCommentForm taskKey={task.key} />}
    </UICard>
  );
}
