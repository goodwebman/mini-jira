import { expect } from 'vitest';
import type { BoardRole } from '@gwmt/contracts';
import { createUser, json, type TestApp, type TestUser } from './helpers.js';

let boardCounter = 0;

export async function createBoard(t: TestApp, owner: TestUser, members: TestUser[] = []) {
  boardCounter += 1;
  const res = await t.request('POST', '/boards', owner.token, {
    name: `Доска ${boardCounter}`,
    key: `T${boardCounter}`,
    memberIds: members.map((member) => member.id),
  });
  expect(res.status).toBe(201);
  return json(res);
}

export async function setRole(t: TestApp, admin: TestUser, boardId: number, userId: string, role: BoardRole) {
  const res = await t.request('PATCH', `/boards/${boardId}/members/${userId}`, admin.token, { role });
  expect(res.status).toBe(200);
}

export interface Team {
  admin: TestUser;
  worker: TestUser;
  guest: TestUser;
  reviewer: TestUser;
  tester: TestUser;
  boardId: number;
  boardKey: string;
}

export async function createTeam(t: TestApp): Promise<Team> {
  const [admin, worker, guest, reviewer, tester] = await Promise.all([
    createUser(t),
    createUser(t),
    createUser(t),
    createUser(t),
    createUser(t),
  ]);
  const board = await createBoard(t, admin, [worker, guest, reviewer, tester]);
  await setRole(t, admin, board.id, guest.id, 'guest');
  return { admin, worker, guest, reviewer, tester, boardId: board.id, boardKey: board.key };
}

export const taskBody = (team: Team, overrides: Record<string, unknown> = {}) => ({
  title: 'Задача',
  sp: 3,
  authorId: team.worker.id,
  reviewerId: team.reviewer.id,
  testerId: team.tester.id,
  ...overrides,
});

export async function createTask(t: TestApp, team: Team, overrides: Record<string, unknown> = {}) {
  const res = await t.request('POST', `/boards/${team.boardId}/tasks`, team.admin.token, taskBody(team, overrides));
  expect(res.status).toBe(201);
  return json(res);
}

export const moveTask = (t: TestApp, token: string, key: string, status: string) =>
  t.request('PATCH', `/tasks/${key}`, token, { status });

export const errorCode = async (res: Response) => (await json(res)).error.code as string;
