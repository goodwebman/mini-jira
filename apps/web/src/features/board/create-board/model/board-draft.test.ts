/** Тесткейсы: транслит ключа из названия; ручной ключ нормализуется и больше не перезаписывается; участники переключаются; валидация контракта. */
import { describe, expect, it } from 'vitest';

import {
  EMPTY_BOARD_DRAFT,
  boardKeyFromName,
  normalizeBoardKey,
  setDraftKey,
  setDraftName,
  toggleDraftMember,
  validateBoardDraft,
} from './board-draft';

describe('ключ доски', () => {
  it.each([
    ['Разработка', 'RAZRA'],
    ['QA team 2', 'QATEA'],
    ['Ёлка', 'ELKA'],
    ['  ', ''],
  ])('%j → %j', (name, key) => {
    expect(boardKeyFromName(name)).toBe(key);
  });

  it('ручной ввод: только A–Z и цифры, до шести знаков', () => {
    expect(normalizeBoardKey('gw-t 12345')).toBe('GWT123');
  });

  it('пока ключ не трогали, он следует за названием; потом — нет', () => {
    const named = setDraftName(EMPTY_BOARD_DRAFT, 'Фронтенд');
    expect(named.key).toBe('FRONT');
    const custom = setDraftKey(named, 'web');
    const renamed = setDraftName(custom, 'Бэкенд');
    expect(renamed).toMatchObject({
      name: 'Бэкенд',
      key: 'WEB',
      keyTouched: true,
    });
  });

  it('участники переключаются', () => {
    const one = toggleDraftMember(EMPTY_BOARD_DRAFT, 'u1');
    expect(toggleDraftMember(one, 'u2').memberIds).toEqual(['u1', 'u2']);
    expect(toggleDraftMember(one, 'u1').memberIds).toEqual([]);
  });
});

describe('validateBoardDraft', () => {
  it('пустая форма — ошибки названия и ключа', () => {
    expect(validateBoardDraft(EMPTY_BOARD_DRAFT)).toEqual({
      ok: false,
      errors: { name: 'Введите название', key: 'Введите ключ' },
    });
  });

  it('пустое описание не отправляется', () => {
    const draft = {
      ...setDraftName(EMPTY_BOARD_DRAFT, ' Разработка '),
      description: '  ',
    };
    expect(validateBoardDraft(draft)).toEqual({
      ok: true,
      body: { name: 'Разработка', key: 'RAZRA', memberIds: [] },
    });
  });
});
