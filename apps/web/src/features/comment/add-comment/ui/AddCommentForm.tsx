import { type FormEvent, useState } from 'react';

import { type CommentMention, createCommentBodySchema } from '@gwmt/contracts';

import { prepareCommentText } from '@/entities/comment';
import { readApiError } from '@/shared/api';
import { UIButton, UIField } from '@/shared/ui';

import { useAddTaskComment } from '../model/use-add-comment';
import { MentionTextarea } from './MentionTextarea';

/** Новый комментарий: валидация по контракту, ошибка — под полем. */
export function AddCommentForm({
  taskKey,
  boardId,
  parentId,
  onSuccess,
  onCancel,
}: {
  readonly taskKey: string;
  readonly boardId: number;
  readonly parentId?: string;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<CommentMention[]>([]);
  const [error, setError] = useState('');
  const mutation = useAddTaskComment(taskKey, parentId);
  const canSubmit = text.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    const parsed = createCommentBodySchema.safeParse(
      prepareCommentText(text, mentions),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Введите комментарий');
      return;
    }
    mutation.mutate(parsed.data, {
      onSuccess: () => {
        setText('');
        setMentions([]);
        onSuccess?.();
      },
      onError: (cause) => setError(readApiError(cause).message),
    });
  };

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-3'>
      <UIField
        label={parentId ? 'Ответ на комментарий' : 'Новый комментарий'}
        error={error || undefined}
      >
        <MentionTextarea
          boardId={boardId}
          disabled={mutation.isPending}
          value={text}
          mentions={mentions}
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
          disabled={!canSubmit}
          loading={mutation.isPending}
        >
          Отправить
        </UIButton>
        {onCancel && (
          <UIButton
            variant='ghost'
            disabled={mutation.isPending}
            onClick={onCancel}
          >
            Отмена
          </UIButton>
        )}
      </div>
    </form>
  );
}
