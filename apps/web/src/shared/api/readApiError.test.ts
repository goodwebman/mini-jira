// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { HttpError } from './client';
import { readApiError } from './readApiError';

const httpError = (status: number, body: unknown) =>
  new HttpError(new Response(null, { status }), body);

describe('readApiError', () => {
  it('берёт message, code, fields и requestId из тела ошибки API', () => {
    const error = httpError(422, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Проверьте заполнение полей',
        fields: { email: 'Неверный email' },
        requestId: 'req-1',
      },
    });
    expect(readApiError(error)).toEqual({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Проверьте заполнение полей',
      fields: { email: 'Неверный email' },
      requestId: 'req-1',
    });
  });

  it('без fields возвращает пустой объект', () => {
    const error = httpError(404, {
      error: {
        code: 'BOARD_NOT_FOUND',
        message: 'Доска не найдена',
        requestId: 'req-2',
      },
    });
    expect(readApiError(error)).toMatchObject({
      code: 'BOARD_NOT_FOUND',
      message: 'Доска не найдена',
      fields: {},
    });
  });

  it.each([null, 'Bad Gateway', { error: 'forbidden' }])(
    'тело не в формате API (%j) даёт запасной текст и сохраняет статус',
    (body) => {
      expect(readApiError(httpError(502, body))).toEqual({
        status: 502,
        code: null,
        message: 'Что-то пошло не так, попробуйте ещё раз',
        fields: {},
        requestId: null,
      });
    },
  );

  it('показывает текст AuthError', () => {
    const error = Object.assign(new Error('Нет соединения с сервером'), {
      name: 'AuthError',
    });
    expect(readApiError(error)).toMatchObject({
      status: null,
      message: 'Нет соединения с сервером',
    });
  });

  it('не показывает пользователю текст произвольной ошибки', () => {
    expect(readApiError(new TypeError('Failed to fetch')).message).toBe(
      'Что-то пошло не так, попробуйте ещё раз',
    );
    expect(readApiError(undefined).message).toBe(
      'Что-то пошло не так, попробуйте ещё раз',
    );
  });
});
