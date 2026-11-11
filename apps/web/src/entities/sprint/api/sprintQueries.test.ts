// @vitest-environment node
/** Тесткейсы: defaults/limit и границы; доска/номер в ключах; список и KPI; nullable прогнозы; неверные id; 404 и повреждённый ответ. */
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boardSprintsQueryOptions, fetchSprintKpi, sprintKpiQueryOptions, sprintQueryKeys, sprintsPath } from '../index';
import { configureApiTransport } from '@/shared/api';

const transport = vi.fn<typeof fetch>();
const sprint = { id: 's1', number: 1, state: 'active', startDate: '2026-11-02', endDate: '2026-11-13' };
const statuses = { todo: 0, work: 0, review: 0, test: 0, done: 0 };

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('sprint queries', () => {
  it('default limit совпадает для URL и ключа', () => {
    expect(sprintsPath(9)).toBe('/boards/9/sprints?limit=8');
    expect(sprintsPath(9, { limit: 100 })).toBe('/boards/9/sprints?limit=100');
    expect(sprintQueryKeys.list(9)).toEqual(['sprint', 'list', 9, { limit: 8 }]);
    expect(sprintQueryKeys.list(9, { limit: 8 })).toEqual(sprintQueryKeys.list(9));
    expect(sprintQueryKeys.kpi(9, 2)).toEqual(['sprint', 'kpi', 9, 2]);
  });

  it.each([0, 101])('limit %s отклоняется, граница 100 допустима', (limit) => {
    expect(() => sprintsPath(9, { limit })).toThrow();
    expect(sprintsPath(9, { limit: 100 })).toBe('/boards/9/sprints?limit=100');
  });

  it('загружает список спринтов', async () => {
    const client = new QueryClient();
    const data = { items: [{ ...sprint, doneSp: 0, scopeSp: 3 }] };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(boardSprintsQueryOptions(9))).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/boards/9/sprints?limit=8');
    client.clear();
  });

  it('загружает KPI, сохраняя nullable прогнозы', async () => {
    const client = new QueryClient();
    const data = {
      serverTime: '2026-11-11T00:00:00Z', board: { id: 9, key: 'GWT', name: 'Команда', colorIndex: 0 },
      sprint: { ...sprint, todayIndex: 7, dayNumber: 8, totalDays: 10 }, isEmpty: true,
      summary: { scopeSp: 0, doneSp: 0, donePct: 0, committedSp: 0, addedSp: 0, addedCount: 0, paceSpPerDay: 0, forecastDoneSp: null, forecastRemainingSp: null, medianCycleDays: 0 },
      days: [], byStatus: statuses, stages: [], slowestStage: null,
      velocity: { items: [], averageDoneSp: null }, team: [],
    };
    transport.mockResolvedValue(Response.json(data));
    await expect(client.fetchQuery(sprintKpiQueryOptions(9, 1))).resolves.toEqual(data);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/boards/9/sprints/1/kpi');
    client.clear();
  });

  it.each([[0, 1], [9, 0], [9, NaN], [9, 1.5]])('id %s/номер %s отключают query', (boardId, number) => {
    expect(sprintKpiQueryOptions(boardId, number).enabled).toBe(false);
    expect(sprintKpiQueryOptions(9, 1).enabled).toBe(true);
  });

  it('404 сохраняет серверный код', async () => {
    transport.mockResolvedValue(Response.json({ error: { code: 'SPRINT_NOT_FOUND' } }, { status: 404 }));
    await expect(fetchSprintKpi(9, 100)).rejects.toMatchObject({ status: 404, body: { error: { code: 'SPRINT_NOT_FOUND' } } });
  });

  it('повреждённый KPI отклоняется', async () => {
    transport.mockResolvedValue(Response.json({ isEmpty: true }));
    await expect(fetchSprintKpi(9, 1)).rejects.toThrow();
  });
});
