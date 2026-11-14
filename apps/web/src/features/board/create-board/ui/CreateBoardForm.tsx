import { type FormEvent, useState } from 'react';

import type { UserBrief } from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { UserChip, userSearchQueryOptions } from '@/entities/user';
import { readApiError } from '@/shared/api';
import { ROUTES } from '@/shared/routes';
import {
  UIAlert,
  UIButton,
  UIDialog,
  UIField,
  UIInput,
  UITextarea,
  useToast,
} from '@/shared/ui';

import {
  type BoardDraft,
  type BoardDraftField,
  EMPTY_BOARD_DRAFT,
  setDraftKey,
  setDraftName,
  toggleDraftMember,
  validateBoardDraft,
} from '../model/board-draft';
import { useCreateBoard } from '../model/use-create-board';

export function CreateBoardForm({
  currentUser,
  onDone,
}: {
  readonly currentUser: Pick<UserBrief, 'colorIndex' | 'id' | 'name'>;
  readonly onDone: () => void;
}) {
  const [draft, setDraft] = useState<BoardDraft>(EMPTY_BOARD_DRAFT);
  const [errors, setErrors] = useState<
    Partial<Record<BoardDraftField, string>>
  >({});
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  // Пустой запрос — люди с других досок пользователя
  const people = useQuery(userSearchQueryOptions({}));
  const candidates = (people.data?.items ?? []).filter(
    (user) => user.id !== currentUser.id,
  );

  const mutation = useCreateBoard();

  const update = (next: BoardDraft, field: BoardDraftField) => {
    setDraft(next);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const result = validateBoardDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    mutation.mutate(result.body, {
      onSuccess: (board) => {
        toast(`Доска «${board.name}» создана`);
        onDone();
        void navigate(ROUTES.BOARD.build(board.id));
      },
      onError: (cause) => {
        const info = readApiError(cause);
        if (info.code === 'BOARD_KEY_TAKEN')
          setErrors({ key: 'Такой ключ уже есть' });
        else if (Object.keys(info.fields).length > 0) setErrors(info.fields);
        else setFormError(info.message);
      },
    });
  };

  return (
    <UIDialog.Content title='Новая доска' size='sm'>
      <form noValidate onSubmit={submit} className='contents'>
        <UIDialog.Body className='flex flex-col gap-4'>
          {formError && <UIAlert tone='danger'>{formError}</UIAlert>}
          <UIField label='Название' error={errors.name}>
            <UIInput
              placeholder='Например, Разработка'
              value={draft.name}
              maxLength={100}
              onChange={(event) =>
                update(setDraftName(draft, event.target.value), 'name')
              }
            />
          </UIField>
          <UIField
            label='Ключ задач'
            error={errors.key}
            hint={`Из него строятся номера задач: ${draft.key || 'GWT'}-101`}
          >
            <UIInput
              placeholder='GWT'
              value={draft.key}
              autoCapitalize='characters'
              onChange={(event) =>
                update(setDraftKey(draft, event.target.value), 'key')
              }
            />
          </UIField>
          <UIField label='Описание' optional error={errors.description}>
            <UITextarea
              rows={3}
              placeholder='О чём эта доска'
              value={draft.description}
              maxLength={2000}
              onChange={(event) =>
                update(
                  { ...draft, description: event.target.value },
                  'description',
                )
              }
            />
          </UIField>
          <UIField
            label='Участники'
            hint='Вы станете администратором, остальные получат роль «Рабочий». Поменять можно в участниках доски.'
          >
            <div role='group' className='flex flex-wrap gap-1'>
              <UserChip
                user={currentUser}
                pressed
                disabled
                onToggle={() => {}}
              />
              {candidates.map((user) => (
                <UserChip
                  key={user.id}
                  user={user}
                  pressed={draft.memberIds.includes(user.id)}
                  onToggle={() =>
                    update(toggleDraftMember(draft, user.id), 'memberIds')
                  }
                />
              ))}
            </div>
          </UIField>
        </UIDialog.Body>
        <UIDialog.Footer>
          <UIDialog.Close>Отмена</UIDialog.Close>
          <UIButton type='submit' loading={mutation.isPending}>
            Создать доску
          </UIButton>
        </UIDialog.Footer>
      </form>
    </UIDialog.Content>
  );
}
