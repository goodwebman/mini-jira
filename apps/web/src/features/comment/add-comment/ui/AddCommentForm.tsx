import { type FormEvent, useState } from 'react';

import { createCommentBodySchema } from '@gwmt/contracts';

import { readApiError } from '@/shared/api';
import { UIButton, UIField, UITextarea } from '@/shared/ui';

import { useAddTaskComment } from '../model/use-add-comment';

/** Новый комментарий: валидация по контракту, ошибка — под полем. */
export function AddCommentForm({ taskKey }: { readonly taskKey: string }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const mutation = useAddTaskComment(taskKey);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createCommentBodySchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Введите комментарий');
      return;
    }
    mutation.mutate(parsed.data.text, {
      onSuccess: () => setText(''),
      onError: (cause) => setError(readApiError(cause).message),
    });
  };

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-3'>
      <UIField label='Новый комментарий' error={error || undefined}>
        <UITextarea
          rows={3}
          placeholder='Напишите комментарий'
          value={text}
          maxLength={10_000}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
        />
      </UIField>
      <div>
        <UIButton type='submit' loading={mutation.isPending}>
          Отправить
        </UIButton>
      </div>
    </form>
  );
}
