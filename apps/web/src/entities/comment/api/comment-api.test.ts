// @vitest-environment node
/** Тесткейсы: пустой комментарий не уходит в сеть; текст обрезается по схеме контракта; ответ проверяется схемой. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';
import { users } from '@/shared/lib/testing';

import { createComment } from './comment-api';

const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('createComment', () => {
  it('пустой комментарий не отправляется, непустой сохраняется с trim', async () => {
    await expect(createComment('GWT-1', { text: '  ' })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    const comment = {
      id: 'c1',
      author: users.anna,
      text: 'Готово',
      createdAt: '2026-11-11T00:00:00Z',
    };
    transport.mockResolvedValue(Response.json(comment, { status: 201 }));
    await expect(createComment('GWT-1', { text: ' Готово ' })).resolves.toEqual(
      comment,
    );
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/tasks/GWT-1/comments',
      expect.objectContaining({ method: 'POST', body: '{"text":"Готово"}' }),
    ]);
  });

  it('ответ не по контракту — ошибка', async () => {
    transport.mockResolvedValue(Response.json({ id: 'c1' }, { status: 201 }));
    await expect(createComment('GWT-1', { text: 'x' })).rejects.toThrow();
  });
});
