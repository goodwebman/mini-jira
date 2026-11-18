import { type TaskDetail, getCommentPermissions } from '@gwmt/contracts';

import { buildCommentThread } from '@/entities/comment';
import { AddCommentForm } from '@/features/comment/add-comment';
import { UICard, UIEmptyState } from '@/shared/ui';

import { TaskCommentRow } from './TaskCommentRow';

/** Комментарии задачи: лента и форма нового — если роль позволяет. */
export function TaskCommentsCard({
  task,
  canComment,
  timeZone,
  commentTarget,
  currentUserId,
}: {
  readonly task: Pick<TaskDetail, 'boardId' | 'comments' | 'key' | 'myRole'>;
  readonly canComment: boolean;
  readonly timeZone: string;
  readonly commentTarget?: { hash: string; key: string };
  readonly currentUserId: string;
}) {
  const commentsById = new Map(
    task.comments.map((comment) => [comment.id, comment]),
  );
  return (
    <UICard padding='lg' className='flex flex-col gap-3'>
      <UICard.Title as='h3' size='sm'>
        Комментарии · {task.comments.length}
      </UICard.Title>
      {task.comments.length === 0 && !canComment && (
        <UIEmptyState title='Комментариев пока нет' />
      )}
      {buildCommentThread(task.comments).map(({ comment, depth }) => (
        <TaskCommentRow
          key={comment.id}
          comment={comment}
          timeZone={timeZone}
          depth={depth}
          taskKey={task.key}
          boardId={task.boardId}
          canComment={canComment}
          permissions={getCommentPermissions(
            task.myRole,
            currentUserId,
            comment.author.id,
          )}
          parent={
            comment.parentId ? commentsById.get(comment.parentId) : undefined
          }
          targetKey={
            commentTarget?.hash === `#comment-${comment.id}`
              ? commentTarget.key
              : undefined
          }
        />
      ))}
      {canComment && (
        <AddCommentForm taskKey={task.key} boardId={task.boardId} />
      )}
    </UICard>
  );
}
