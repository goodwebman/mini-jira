import { type FormEvent, useState } from 'react';

import {
  type CommentMention,
  type TaskComment,
  updateCommentBodySchema,
} from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';

import { boardQueryOptions } from '@/entities/board';
import { MentionTextarea, prepareCommentText } from '@/entities/comment';
import { readApiError } from '@/shared/api';
import { UIButton, UIField } from '@/shared/ui';

import { useEditComment } from '../model/use-edit-comment';

export function EditCommentForm({
  taskKey,
  boardId,
  comment,
  onDone,
}: {
  readonly taskKey: string;
  readonly boardId: number;
  readonly comment: TaskComment;
  readonly onDone: () => void;
}) {
  const [text, setText] = useState(comment.text);
  const [mentions, setMentions] = useState<CommentMention[]>(
    comment.mentions ?? [],
  );
  const [error, setError] = useState('');
  const mutation = useEditComment(taskKey, comment.id);
  const board = useQuery({
    ...boardQueryOptions(boardId),
    enabled: text.includes('@') && !mutation.isPending,
  });
  const canSubmit =
    text.trim().length > 0 &&
    (text.trim() !== comment.text ||
      JSON.stringify(mentions) !== JSON.stringify(comment.mentions ?? []));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    const result = updateCommentBodySchema.safeParse(
      prepareCommentText(text, mentions),
    );
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Проверьте комментарий');
      return;
    }
    mutation.mutate(result.data, {
      onSuccess: onDone,
      onError: (cause) => setError(readApiError(cause).message),
    });
  };
  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-3'>
      <UIField label='Текст комментария' error={error || undefined}>
        <MentionTextarea
          members={board.data?.members ?? []}
          loading={board.isPending}
          failed={board.isError}
          value={text}
          mentions={mentions}
          disabled={mutation.isPending}
          onChange={(value, tagged) => {
            setText(value);
            setMentions(tagged);
            setError('');
          }}
        />
      </UIField>
      <div className='flex gap-2'>
        <UIButton
          type='submit'
          loading={mutation.isPending}
          disabled={!canSubmit}
        >
          Сохранить комментарий
        </UIButton>
        <UIButton
          variant='ghost'
          disabled={mutation.isPending}
          onClick={onDone}
        >
          Отмена
        </UIButton>
      </div>
    </form>
  );
}
