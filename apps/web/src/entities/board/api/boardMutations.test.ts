// @vitest-environment node
/**
 * Тесткейсы: создание доски и участника; изменение роли; удаление участника;
 * идемпотентные методы избранного; валидация тела до сети; ошибка 409 не теряется.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';

import {
  addBoardMember,
  addBoardToFavorites,
  createBoard,
  removeBoardFromFavorites,
  removeBoardMember,
  updateBoardMember,
} from '../index';

const transport = vi.fn<typeof fetch>();
const userId = '00000000-0000-4000-8000-000000000001';
const member = {
  id: userId,
  name: 'Анна',
  job: '',
  colorIndex: 0,
  email: 'anna@example.com',
  role: 'worker',
  addedAt: '2026-11-01T00:00:00Z',
};

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('board mutations', () => {
  it('создаёт доску с нормализованным именем и возвращает детали', async () => {
    const result = {
      id: 9,
      key: 'GWT',
      name: 'Команда',
      description: '',
      colorIndex: 0,
      timezone: 'Europe/Moscow',
      isFavorite: false,
      myRole: 'admin',
      members: [],
      currentSprint: {
        id: 's1',
        number: 1,
        state: 'active',
        startDate: '2026-11-02',
        endDate: '2026-11-13',
      },
    };
    transport.mockResolvedValue(Response.json(result, { status: 201 }));
    await expect(
      createBoard({ name: '  Команда  ', key: 'GWT', memberIds: [] }),
    ).resolves.toEqual(result);
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/boards',
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"Команда","key":"GWT","memberIds":[]}',
      }),
    ]);
  });

  it('не отправляет пустое имя, корректное имя отправляет', async () => {
    await expect(
      createBoard({ name: ' ', key: 'GWT', memberIds: [] }),
    ).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    transport.mockResolvedValue(
      Response.json({ error: { code: 'BOARD_KEY_TAKEN' } }, { status: 409 }),
    );
    await expect(
      createBoard({ name: 'Команда', key: 'GWT', memberIds: [] }),
    ).rejects.toMatchObject({ status: 409 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('добавляет участника и меняет его роль', async () => {
    transport
      .mockResolvedValueOnce(Response.json(member, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...member, role: 'guest' }));
    await expect(addBoardMember(9, { userId })).resolves.toEqual(member);
    await expect(
      updateBoardMember(9, userId, { role: 'guest' }),
    ).resolves.toEqual({ ...member, role: 'guest' });
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/boards/9/members',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    ]);
    expect(transport.mock.calls[1]).toEqual([
      `/api/v1/boards/9/members/${userId}`,
      expect.objectContaining({ method: 'PATCH', body: '{"role":"guest"}' }),
    ]);
  });

  it.each([
    {
      run: () => addBoardToFavorites(9),
      path: '/api/v1/boards/9/favorite',
      method: 'PUT',
    },
    {
      run: () => removeBoardFromFavorites(9),
      path: '/api/v1/boards/9/favorite',
      method: 'DELETE',
    },
    {
      run: () => removeBoardMember(9, userId),
      path: `/api/v1/boards/9/members/${userId}`,
      method: 'DELETE',
    },
  ])('$method $path принимает 204 без JSON', async ({ run, path, method }) => {
    transport.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(run()).resolves.toBeUndefined();
    expect(transport.mock.calls[0]).toEqual([
      path,
      expect.objectContaining({ method, body: undefined }),
    ]);
  });
});
