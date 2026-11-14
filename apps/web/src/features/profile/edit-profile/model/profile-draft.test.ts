/** Тесткейсы: без изменений — пустое тело; отправляются только изменённые поля после trim; ошибки имени и email. */
import { describe, expect, it } from 'vitest';

import { makeMe } from '@/shared/lib/testing';

import { profileDraftFrom, validateProfileDraft } from './profile-draft';

describe('профиль', () => {
  const me = makeMe({ job: 'QA' });

  it('без изменений тело пустое', () => {
    expect(validateProfileDraft(profileDraftFrom(me), me)).toEqual({
      ok: true,
      body: {},
    });
  });

  it('отправляет только изменённые поля, после trim', () => {
    expect(
      validateProfileDraft(
        {
          ...profileDraftFrom(me),
          job: ' Тимлид ',
          timezone: 'Asia/Novosibirsk',
        },
        me,
      ),
    ).toEqual({
      ok: true,
      body: { job: 'Тимлид', timezone: 'Asia/Novosibirsk' },
    });
  });

  it('пустое имя и плохой email', () => {
    const result = validateProfileDraft(
      { ...profileDraftFrom(me), name: ' ', email: 'x' },
      me,
    );
    expect(result.ok ? null : result.errors).toEqual({
      name: 'Введите имя',
      email: 'Введите корректный email',
    });
  });
});
