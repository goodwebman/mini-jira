/** Тесткейсы: пустые параметры; кодирование Unicode и спецсимволов; сохранение 0 и false. */
import { describe, expect, it } from 'vitest';

import { withQuery } from './withQuery';

describe('withQuery', () => {
  it('не добавляет ? для пустых параметров', () => {
    expect(withQuery('/tasks', { q: '', status: undefined })).toBe('/tasks');
  });

  it('кодирует строку поиска и сохраняет 0 и false', () => {
    expect(withQuery('/tasks', { q: 'Я &?', page: 0, paused: false })).toBe(
      '/tasks?q=%D0%AF+%26%3F&page=0&paused=false',
    );
  });
});
