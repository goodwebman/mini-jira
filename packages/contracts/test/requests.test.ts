import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  boardIdParamSchema,
  createBoardBodySchema,
  createTaskBodySchema,
  loginBodySchema,
  registerBodySchema,
  taskKeyParamSchema,
  updateMeBodySchema,
  userSearchQuerySchema,
} from '../src/index.js';

const fieldMessage = (schema: z.ZodType, value: unknown, field: string) => {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

const UUID = '3f2b7a52-9f0e-4f0a-8f6a-1c2d3e4f5a6b';

describe('тексты ошибок из контракта', () => {
  it('регистрация', () => {
    const valid = {
      name: 'Анна Смирнова',
      email: 'anna@example.com',
      password: 'password',
      acceptedTerms: true,
    };
    expect(registerBodySchema.safeParse(valid).success).toBe(true);
    expect(
      fieldMessage(registerBodySchema, { ...valid, name: '   ' }, 'name'),
    ).toBe('Введите имя и фамилию');
    expect(
      fieldMessage(registerBodySchema, { ...valid, email: 'nope' }, 'email'),
    ).toBe('Введите корректный email');
    expect(
      fieldMessage(
        registerBodySchema,
        { ...valid, password: 'short' },
        'password',
      ),
    ).toBe('Минимум 8 символов');
    expect(
      fieldMessage(
        registerBodySchema,
        { ...valid, acceptedTerms: false },
        'acceptedTerms',
      ),
    ).toBe('Нужно принять условия');
  });

  it('пустые поля дают тот же текст, что и неверные', () => {
    expect(fieldMessage(registerBodySchema, {}, 'name')).toBe(
      'Введите имя и фамилию',
    );
    expect(fieldMessage(registerBodySchema, {}, 'email')).toBe(
      'Введите корректный email',
    );
    expect(fieldMessage(loginBodySchema, {}, 'password')).toBe(
      'Введите пароль',
    );
  });

  it('вход', () => {
    expect(
      fieldMessage(
        loginBodySchema,
        { email: 'a@b.co', password: '', remember: true },
        'password',
      ),
    ).toBe('Введите пароль');
  });

  it('профиль', () => {
    expect(fieldMessage(updateMeBodySchema, { name: '  ' }, 'name')).toBe(
      'Введите имя',
    );
    expect(updateMeBodySchema.safeParse({}).success).toBe(true);
  });

  it('доска', () => {
    expect(fieldMessage(createBoardBodySchema, { memberIds: [] }, 'name')).toBe(
      'Введите название',
    );
    expect(
      fieldMessage(
        createBoardBodySchema,
        { name: 'x', key: 'abc', memberIds: [] },
        'key',
      ),
    ).toBe('Введите ключ');
    expect(
      createBoardBodySchema.safeParse({
        name: 'x',
        key: 'ABC123',
        memberIds: [],
      }).success,
    ).toBe(true);
    expect(
      fieldMessage(
        createBoardBodySchema,
        { name: 'x', key: 'ABCDEFG', memberIds: [] },
        'key',
      ),
    ).toBe('Введите ключ');
  });

  describe('задача', () => {
    const valid = { title: 'Задача', sp: 3, authorId: UUID, reviewerId: UUID };

    it('валидная проходит', () => {
      expect(createTaskBodySchema.safeParse(valid).success).toBe(true);
    });

    it('без ревьювера', () => {
      expect(
        fieldMessage(
          createTaskBodySchema,
          { ...valid, reviewerId: undefined },
          'reviewerId',
        ),
      ).toBe('Выберите ревьювера');
    });

    it('без названия', () => {
      expect(
        fieldMessage(createTaskBodySchema, { ...valid, title: ' ' }, 'title'),
      ).toBe('Введите название');
    });

    it.each([0, -1, 1000, 1.25])('оценка %s отклоняется', (sp) => {
      expect(fieldMessage(createTaskBodySchema, { ...valid, sp }, 'sp')).toBe(
        'Введите число больше 0',
      );
    });

    it.each([0.1, 0.3, 2.5, 999, 998.9])('оценка %s проходит', (sp) => {
      expect(createTaskBodySchema.safeParse({ ...valid, sp }).success).toBe(
        true,
      );
    });
  });
});

describe('параметры', () => {
  it('ключ задачи', () => {
    expect(taskKeyParamSchema.safeParse({ key: 'GWT-101' }).success).toBe(true);
    expect(taskKeyParamSchema.safeParse({ key: 'gwt-101' }).success).toBe(
      false,
    );
    expect(taskKeyParamSchema.safeParse({ key: 'GWT' }).success).toBe(false);
  });

  it('id доски за пределами integer не проходит', () => {
    expect(boardIdParamSchema.safeParse({ boardId: '9' }).data).toEqual({
      boardId: 9,
    });
    expect(
      boardIdParamSchema.safeParse({ boardId: '99999999999' }).success,
    ).toBe(false);
    expect(boardIdParamSchema.safeParse({ boardId: 'abc' }).success).toBe(
      false,
    );
  });

  it('поиск людей: пустой q разрешён, один символ нет', () => {
    expect(userSearchQuerySchema.safeParse({ q: '' }).success).toBe(true);
    expect(userSearchQuerySchema.safeParse({}).success).toBe(true);
    expect(userSearchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(userSearchQuerySchema.safeParse({ q: 'ан' }).success).toBe(true);
  });
});

describe('локаль', () => {
  it('сообщения zod по умолчанию на русском', () => {
    const message = fieldMessage(
      loginBodySchema,
      { email: 'a@b.co', password: 'x' },
      'remember',
    );
    expect(message).toMatch(/[а-яё]/i);
  });
});
