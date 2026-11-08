import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, json, signedPost, type TestApp } from './helpers.js';

describe('профиль', () => {
  let t: TestApp;

  const post = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
    signedPost(t, path, body, headers);

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  it('GET /me отдаёт Me', async () => {
    const user = await createUser(t, { job: 'Разработчик' });
    const body = await json(await t.request('GET', '/me', user.token));
    expect(body).toMatchObject({
      id: user.id,
      email: user.email,
      job: 'Разработчик',
      timezone: 'Europe/Moscow',
      hasPassword: false,
      hasGithub: false,
      hasGoogle: false,
    });
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('googleId');
  });

  it('PATCH /me меняет поля и не трогает остальные', async () => {
    const user = await createUser(t);
    const res = await t.request('PATCH', '/me', user.token, {
      name: 'Новое имя',
      job: 'Тимлид',
      timezone: 'Asia/Novosibirsk',
    });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({
      name: 'Новое имя',
      job: 'Тимлид',
      timezone: 'Asia/Novosibirsk',
      email: user.email,
    });
  });

  it('пустое имя в профиле даёт текст из контракта', async () => {
    const user = await createUser(t);
    const res = await t.request('PATCH', '/me', user.token, { name: '  ' });
    expect(res.status).toBe(422);
    expect((await json(res)).error.fields.name).toBe('Введите имя');
  });

  it('чужой email даёт EMAIL_TAKEN, свой проходит', async () => {
    const other = await createUser(t);
    const user = await createUser(t);
    const taken = await t.request('PATCH', '/me', user.token, { email: other.email });
    expect(taken.status).toBe(409);
    expect((await json(taken)).error.code).toBe('EMAIL_TAKEN');
    const same = await t.request('PATCH', '/me', user.token, { email: user.email.toUpperCase() });
    expect(same.status).toBe(200);
  });

  describe('смена пароля', () => {
    const newAccount = async () => {
      const email = `pw${crypto.randomUUID()}@example.com`;
      const res = await post('/auth/register', {
        name: 'Пароль',
        email,
        password: 'password',
        acceptedTerms: true,
      });
      const body = await json(res);
      const cookie = res.headers.getSetCookie()[0]!.split(';')[0]!;
      return { email, token: body.accessToken as string, cookie };
    };

    it('неверный текущий пароль: 422, не 401', async () => {
      const { token } = await newAccount();
      const res = await t.request('POST', '/me/password', token, {
        currentPassword: 'wrong-pass',
        newPassword: 'new-password',
      });
      expect(res.status).toBe(422);
      const { error } = await json(res);
      expect(error.code).toBe('WRONG_PASSWORD');
      expect(error.fields.currentPassword).toBe('Неверный пароль');
    });

    it('после смены остальные сессии отозваны, текущая жива', async () => {
      const first = await newAccount();
      const second = await post('/auth/login', {
        email: first.email,
        password: 'password',
        remember: true,
      });
      const otherCookie = second.headers.getSetCookie()[0]!.split(';')[0]!;

      const res = await t.request('POST', '/me/password', first.token, {
        currentPassword: 'password',
        newPassword: 'new-password',
      });
      expect(res.status).toBe(204);

      expect((await post('/auth/refresh', undefined, { Cookie: otherCookie })).status).toBe(401);
      expect((await post('/auth/refresh', undefined, { Cookie: first.cookie })).status).toBe(200);

      const login = await post('/auth/login', {
        email: first.email,
        password: 'new-password',
        remember: true,
      });
      expect(login.status).toBe(200);
    });

    it('без пароля currentPassword не нужен', async () => {
      const user = await createUser(t);
      const res = await t.request('POST', '/me/password', user.token, { newPassword: 'new-password' });
      expect(res.status).toBe(204);
      expect((await json(await t.request('GET', '/me', user.token))).hasPassword).toBe(true);
    });

    it('короткий новый пароль даёт текст из контракта', async () => {
      const user = await createUser(t);
      const res = await t.request('POST', '/me/password', user.token, { newPassword: '123' });
      expect(res.status).toBe(422);
      expect((await json(res)).error.fields.newPassword).toBe('Минимум 8 символов');
    });
  });
});
