// @vitest-environment node
/** Тесткейсы: профиль, сводка без досок, статистика; boardId в URL/ключе; PATCH с trim; пароль и 204; ошибки сервера. */
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changePassword, fetchProfile, myTaskStatsQueryOptions, navSummaryPath,
  navSummaryQueryOptions, profileQueryKeys, profileQueryOptions, updateProfile,
} from '../index';
import { configureApiTransport } from '@/shared/api';

const transport = vi.fn<typeof fetch>();
const profile = { id: 'u1', name: 'Анна', email: 'anna@example.com', job: '', timezone: 'Europe/Moscow', colorIndex: 0, hasPassword: true, hasGithub: false, hasGoogle: false };

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('profile', () => {
  it('загружает профиль через queryOptions', async () => {
    const client = new QueryClient();
    transport.mockResolvedValue(Response.json(profile));
    await expect(client.fetchQuery(profileQueryOptions)).resolves.toEqual(profile);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/me');
    client.clear();
  });

  it('не подставляет выбранную доску, когда boardId не задан', () => {
    expect(navSummaryPath()).toBe('/me/nav-summary');
    expect(navSummaryPath({ boardId: 9 })).toBe('/me/nav-summary?boardId=9');
    expect(profileQueryKeys.navSummary()).toEqual(['profile', 'nav-summary', {}]);
    expect(profileQueryKeys.navSummary({ boardId: 9 })).toEqual(['profile', 'nav-summary', { boardId: 9 }]);
  });

  it('сводка пользователя без досок сохраняет null', async () => {
    const client = new QueryClient();
    const data = { boardsTotal: 0, board: null, myTasks: { openCount: 0, openSp: 0, next: [] }, kpi: null };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(navSummaryQueryOptions())).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/me/nav-summary');
    client.clear();
  });

  it('загружает статистику задач', async () => {
    const client = new QueryClient();
    const data = { open: 0, closed: 0, totalSp: 0, nextOpen: [] };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(myTaskStatsQueryOptions)).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/me/task-stats');
    client.clear();
  });

  it('PATCH нормализует поля и возвращает профиль', async () => {
    transport.mockResolvedValue(Response.json({ ...profile, job: 'QA' }));
    await expect(updateProfile({ name: ' Анна ', job: ' QA ' })).resolves.toEqual({ ...profile, job: 'QA' });
    expect(transport.mock.calls[0]).toEqual(['/api/v1/me', expect.objectContaining({ method: 'PATCH', body: '{"name":"Анна","job":"QA"}' })]);
  });

  it('короткий пароль не отправляется; OAuth-профилю currentPassword не нужен', async () => {
    await expect(changePassword({ newPassword: '1234567' })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    transport.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(changePassword({ newPassword: '12345678' })).resolves.toBeUndefined();
    expect(transport.mock.calls[0]).toEqual(['/api/v1/me/password', expect.objectContaining({ method: 'POST', body: '{"newPassword":"12345678"}' })]);
  });

  it('WRONG_PASSWORD сохраняется как 422', async () => {
    transport.mockResolvedValue(Response.json({ error: { code: 'WRONG_PASSWORD' } }, { status: 422 }));
    await expect(changePassword({ currentPassword: 'wrong', newPassword: '12345678' })).rejects.toMatchObject({ status: 422, body: { error: { code: 'WRONG_PASSWORD' } } });
  });

  it('не принимает неполный профиль', async () => {
    transport.mockResolvedValue(Response.json({ id: 'u1' }));
    await expect(fetchProfile()).rejects.toThrow();
  });
});
