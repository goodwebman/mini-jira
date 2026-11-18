// @vitest-environment node
/** Тесткейсы: пустой комментарий не уходит в сеть; текст обрезается по схеме контракта; ответ проверяется схемой. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';
import { users } from '@/shared/lib/testing';

import { createComment, deleteComment, updateComment } from './comment-api';

const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('createComment', () => {
  it('изменение проверяет тело до запроса; удаление принимает 204; пути кодируются', async () => {
    await expect(updateComment('GWT-1', 'c1', { text: ' ' })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    const comment = {
      id: 'c1',
      parentId: null,
      author: users.anna,
      text: 'Новое',
      createdAt: '2026-11-11T00:00:00Z',
    };
    transport
      .mockResolvedValueOnce(Response.json(comment))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      updateComment('GWT/1', 'c/1', { text: ' Новое ' }),
    ).resolves.toEqual(comment);
    await expect(deleteComment('GWT/1', 'c/1')).resolves.toBeUndefined();
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/tasks/GWT%2F1/comments/c%2F1',
      expect.objectContaining({ method: 'PATCH', body: '{"text":"Новое"}' }),
    ]);
    expect(transport.mock.calls[1]).toEqual([
      '/api/v1/tasks/GWT%2F1/comments/c%2F1',
      expect.objectContaining({ method: 'DELETE' }),
    ]);
  });
  it('пустой комментарий не отправляется, непустой сохраняется с trim', async () => {
    await expect(createComment('GWT-1', { text: '  ' })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    const comment = {
      id: 'c1',
      parentId: null,
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
