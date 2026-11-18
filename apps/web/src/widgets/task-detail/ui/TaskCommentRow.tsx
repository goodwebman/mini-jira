import { useState } from 'react';

import type { TaskComment } from '@gwmt/contracts';

import { CommentItem } from '@/entities/comment';
import { UserAvatar } from '@/entities/user';
import { AddCommentForm } from '@/features/comment/add-comment';
import { CopyCommentLinkButton } from '@/features/comment/copy-link';
import { DeleteCommentButton } from '@/features/comment/delete-comment';
import { EditCommentForm } from '@/features/comment/edit-comment';
import { UIButton } from '@/shared/ui';

import { useCommentTarget } from '../model/use-comment-target';

export function TaskCommentRow({
  comment,
  depth,
  taskKey,
  boardId,
  canComment,
  timeZone,
  targetKey,
  parent,
  permissions,
}: {
  readonly comment: TaskComment;
  readonly depth: number;
  readonly taskKey: string;
  readonly boardId: number;
  readonly canComment: boolean;
  readonly timeZone: string;
  readonly targetKey?: string;
  readonly parent?: TaskComment;
  readonly permissions: {
    readonly canEdit: boolean;
    readonly canDelete: boolean;
  };
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useCommentTarget(targetKey);
  return (
    <div
      ref={ref}
      id={`comment-${comment.id}`}
      tabIndex={-1}
      style={{ marginInlineStart: `${Math.min(depth, 3) * 12}px` }}
      className='flex min-w-0 scroll-mt-6 flex-col gap-2 rounded-control border-l-2 border-transparent p-2 transition-colors duration-500 focus:outline-none data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-primary-tint motion-reduce:transition-none'
    >
      {parent && (
        <p className='m-0 text-small text-muted-foreground'>
          В ответ {parent.author.name}
        </p>
      )}
      <CommentItem
        comment={comment}
        timeZone={timeZone}
        avatar={<UserAvatar user={comment.author} size='md' />}
        actions={
          <>
            {canComment && (
              <UIButton
                size='sm'
                variant='ghost'
                aria-expanded={replying}
                onClick={() => setReplying(!replying)}
              >
                Ответить
              </UIButton>
            )}
            <CopyCommentLinkButton taskKey={taskKey} commentId={comment.id} />
            {permissions.canEdit && (
              <UIButton
                size='sm'
                variant='ghost'
                aria-expanded={editing}
                onClick={() => {
                  setEditing(!editing);
                  setReplying(false);
                }}
              >
                Редактировать комментарий
              </UIButton>
            )}
            {permissions.canDelete && (
              <DeleteCommentButton taskKey={taskKey} commentId={comment.id} />
            )}
          </>
        }
      />
      {permissions.canEdit && editing && (
        <EditCommentForm
          taskKey={taskKey}
          boardId={boardId}
          comment={comment}
          onDone={() => setEditing(false)}
        />
      )}
      {canComment && replying && (
        <AddCommentForm
          taskKey={taskKey}
          boardId={boardId}
          parentId={comment.id}
          onSuccess={() => setReplying(false)}
          onCancel={() => setReplying(false)}
        />
      )}
    </div>
  );
}
