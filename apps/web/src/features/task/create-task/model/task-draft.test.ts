/** Тесткейсы: черновик по умолчанию; автор — сам пользователь, если он на доске; смена доски сбрасывает чужих; валидация схемой контракта, SP с запятой, необязательные роли → null; рабочий всегда в «К работе»; без доски — ошибка. */
import { describe, expect, it } from 'vitest';

import { users } from '@/shared/lib/testing';

import {
  type TaskDraft,
  changeDraftBoard,
  createTaskDraft,
  defaultAuthorId,
  resolveDraftBoardId,
  validateTaskDraft,
} from './task-draft';

const filled = (patch: Partial<TaskDraft> = {}): TaskDraft => ({
  ...createTaskDraft({ boardId: 9, status: 'review' }),
  title: '  Экран входа ',
  sp: '2,5',
  authorId: users.anna.id,
  reviewerId: users.ivan.id,
  ...patch,
});

describe('черновик задачи', () => {
  it('по умолчанию: средний приоритет, статус из колонки', () => {
    expect(createTaskDraft({ boardId: 9 })).toMatchObject({
      boardId: 9,
      status: 'todo',
      priority: 'med',
      authorId: '',
    });
  });

  it('автор по умолчанию — сам пользователь, иначе первый на доске', () => {
    expect(defaultAuthorId([users.ivan.id, users.anna.id], users.anna.id)).toBe(
      users.anna.id,
    );
    expect(defaultAuthorId([users.ivan.id], users.anna.id)).toBe(users.ivan.id);
    expect(defaultAuthorId([], users.anna.id)).toBe('');
  });

  it('смена доски сбрасывает людей, которых там нет', () => {
    const next = changeDraftBoard(filled({ testerId: users.elena.id }), 11, [
      users.anna.id,
      users.elena.id,
    ]);
    expect(next).toMatchObject({
      boardId: 11,
      authorId: users.anna.id,
      reviewerId: '',
      testerId: users.elena.id,
    });
  });
});

describe('resolveDraftBoardId', () => {
  it('предложенная доска годится, только если на ней можно создавать задачи', () => {
    expect(resolveDraftBoardId(9, [11, 9])).toBe(9);
    expect(resolveDraftBoardId(9, [11, 12])).toBe(11);
    expect(resolveDraftBoardId(null, [11])).toBe(11);
    expect(resolveDraftBoardId(9, [])).toBeNull();
  });

  it('пока список досок грузится, держит предложенную', () => {
    expect(resolveDraftBoardId(9, undefined)).toBe(9);
  });
});

describe('validateTaskDraft', () => {
  it('администратор: тело по контракту, SP с запятой, пустые роли — null', () => {
    expect(validateTaskDraft(filled(), 'admin')).toEqual({
      ok: true,
      boardId: 9,
      body: {
        title: 'Экран входа',
        status: 'review',
        priority: 'med',
        sp: 2.5,
        authorId: users.anna.id,
        reviewerId: users.ivan.id,
        testerId: null,
        designerId: null,
      },
    });
  });

  it('рабочий создаёт только в «К работе», даже если статус подменили', () => {
    const result = validateTaskDraft(filled(), 'worker');
    expect(result.ok && result.body.status).toBe('todo');
  });

  it('ошибки по полям: название, оценка, ревьювер, доска', () => {
    const result = validateTaskDraft(
      filled({ title: ' ', sp: '0', reviewerId: '', boardId: null }),
      'admin',
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        title: 'Введите название',
        sp: 'Введите число больше 0',
        reviewerId: 'Выберите ревьювера',
        boardId: 'Выберите доску',
      },
    });
  });

  it.each(['abc', '1000', '0,05', '-1'])('оценка %j не проходит', (sp) => {
    const result = validateTaskDraft(filled({ sp }), 'admin');
    expect(result.ok ? null : result.errors.sp).toBe('Введите число больше 0');
  });
});
