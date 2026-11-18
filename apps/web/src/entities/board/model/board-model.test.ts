/** Тесткейсы: права по ролям совпадают с контрактом; подпись строки доски с формами слова; гости не назначаются; текущая доска: старт из хранилища, запоминание, забывание, повтор без уведомления. */
import { describe, expect, it, vi } from 'vitest';

import { createMemoryPersistence } from '@/shared/lib/store';
import { makeBoardListItem, makeMember, users } from '@/shared/lib/testing';

import {
  assignableMembers,
  boardMetaLine,
  createCurrentBoardStore,
  getBoardPermissions,
  parseStoredBoardId,
} from '../index';

describe('getBoardPermissions', () => {
  it('администратор может всё', () => {
    expect(getBoardPermissions('admin')).toEqual({
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canLinkTasks: true,
      canComment: true,
      canPauseTasks: true,
      canLockTasks: true,
      canManageMembers: true,
      isReadOnly: false,
    });
  });

  it('рабочий: создаёт, двигает, комментирует, связывает; не правит, не запрещает, не управляет людьми', () => {
    expect(getBoardPermissions('worker')).toEqual({
      canCreateTask: true,
      canEditTask: false,
      canDeleteTask: false,
      canLinkTasks: true,
      canComment: true,
      canPauseTasks: true,
      canLockTasks: false,
      canManageMembers: false,
      isReadOnly: false,
    });
  });

  it('гость только смотрит', () => {
    const guest = getBoardPermissions('guest');
    expect(guest.isReadOnly).toBe(true);
    expect(
      Object.entries(guest).filter(
        ([key, value]) => key !== 'isReadOnly' && value,
      ),
    ).toEqual([]);
  });
});

describe('представление доски', () => {
  it('подпись строки списка', () => {
    expect(
      boardMetaLine(makeBoardListItem({ memberCount: 1, myRole: 'guest' })),
    ).toBe('ID:9 · GWT · 1 участник · Гость');
    expect(boardMetaLine(makeBoardListItem({ memberCount: 22 }))).toBe(
      'ID:9 · GWT · 22 участника · Администратор',
    );
  });

  it('гостей нельзя назначить на задачу', () => {
    const members = [
      makeMember(users.anna, 'admin'),
      makeMember(users.viktoria, 'guest'),
    ];
    expect(assignableMembers(members).map((member) => member.name)).toEqual([
      'Анна Смирнова',
    ]);
  });
});

describe('createCurrentBoardStore', () => {
  it('стартует с сохранённой доски, запоминает и забывает', () => {
    const persistence = createMemoryPersistence<number>(9);
    const store = createCurrentBoardStore({ persistence });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getSnapshot()).toBe(9);

    store.remember(9);
    expect(listener).not.toHaveBeenCalled();

    store.remember(11);
    expect(store.getSnapshot()).toBe(11);
    expect(persistence.load()).toBe(11);

    store.forget();
    expect(store.getSnapshot()).toBeNull();
    expect(persistence.load()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('из хранилища принимается только положительный целый id', () => {
    expect(parseStoredBoardId(9)).toBe(9);
    expect(parseStoredBoardId(0)).toBeNull();
    expect(parseStoredBoardId('9')).toBeNull();
    expect(parseStoredBoardId(1.5)).toBeNull();
  });
});
