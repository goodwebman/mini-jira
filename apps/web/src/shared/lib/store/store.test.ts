/** Тесткейсы: setState значением и функцией; уведомления и отписка; та же ссылка не будит подписчиков; отписка во время уведомления; persistence в памяти и в Storage, битый JSON и квота. */
import { describe, expect, it, vi } from 'vitest';

import { createStore } from './create-store';
import {
  createMemoryPersistence,
  createStoragePersistence,
} from './persistence';

describe('createStore', () => {
  it('меняет состояние значением и функцией и уведомляет подписчиков', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    store.setState((previous) => ({ count: previous.count + 1 }));
    expect(store.getSnapshot()).toEqual({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.setState({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('не уведомляет, если ссылка на состояние не изменилась', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((previous) => previous);
    expect(listener).not.toHaveBeenCalled();
  });

  it('подписчик может отписаться во время уведомления, остальные получат событие', () => {
    const store = createStore(0);
    const second = vi.fn();
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);
    store.setState(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('persistence', () => {
  it('в памяти хранит последнее значение и очищается', () => {
    const memory = createMemoryPersistence<number>();
    expect(memory.load()).toBeNull();
    memory.save(5);
    expect(memory.load()).toBe(5);
    memory.clear();
    expect(memory.load()).toBeNull();
  });

  it('Storage: JSON туда и обратно, чужие данные отбрасывает parse', () => {
    const persistence = createStoragePersistence(
      sessionStorage,
      'test-key',
      (raw) => (typeof raw === 'number' ? raw : null),
    );
    persistence.save(7);
    expect(persistence.load()).toBe(7);
    sessionStorage.setItem('test-key', '"строка"');
    expect(persistence.load()).toBeNull();
    sessionStorage.setItem('test-key', '{битый json');
    expect(persistence.load()).toBeNull();
    persistence.clear();
    expect(sessionStorage.getItem('test-key')).toBeNull();
  });

  it('ошибки хранилища не роняют приложение', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    const persistence = createStoragePersistence(broken, 'k', () => 1);
    expect(persistence.load()).toBeNull();
    expect(() => persistence.save(1)).not.toThrow();
    expect(() => persistence.clear()).not.toThrow();
    expect(createStoragePersistence(undefined, 'k', () => 1).load()).toBeNull();
  });
});
