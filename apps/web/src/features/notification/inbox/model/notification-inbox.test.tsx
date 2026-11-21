import type { ReactNode } from 'react';

import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  notificationQueryKeys,
  notificationsQueryOptions,
} from '@/entities/notification';
import { configureApiTransport } from '@/shared/api';
import { createApiMock } from '@/shared/lib/testing';

import { NotificationCenter } from '../ui/NotificationCenter';
import { useNotificationSync } from './use-notification-sync';

const notification = {
  id: '00000000-0000-4000-8000-000000000001',
  type: 'board_member_added',
  boardId: 7,
  boardName: 'Команда',
  createdAt: '2026-11-16T09:00:00.000Z',
  readAt: null,
};
const response = {
  items: [notification],
  total: 1,
  unreadCount: 1,
  page: 1,
  pageSize: 20,
};
let client: QueryClient;
let api: ReturnType<typeof createApiMock>;

function Wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  api = createApiMock().on('GET', '/notifications', response);
  configureApiTransport(api.fetch);
  vi.stubEnv('VITE_API_URL', '/api/v1');
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  document.title = 'mini-jira';
});
afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused(undefined);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('notification synchronization', () => {
  it('shows a steady title when reduced motion is requested', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => false,
    }));
    vi.useFakeTimers();
    client.setQueryData(notificationQueryKeys.list(1), response);
    renderHook(useNotificationSync, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(document.title).toBe('У вас новое уведомление (1)');
  });
  it('blinks the title, updates the count, and restores it on read and unmount', async () => {
    vi.useFakeTimers();
    client.setQueryData(notificationQueryKeys.list(1), response);
    const view = renderHook(useNotificationSync, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.title).toBe('mini-jira');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.title).toBe('У вас новое уведомление (1)');
    await act(async () => {
      client.setQueryData(notificationQueryKeys.list(1), {
        ...response,
        unreadCount: 2,
      });
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(document.title).toBe('У вас новое уведомление (2)');
    await act(async () => {
      client.setQueryData(notificationQueryKeys.list(1), {
        ...response,
        unreadCount: 0,
      });
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(document.title).toBe('mini-jira');
    await act(async () => {
      client.setQueryData(notificationQueryKeys.list(1), response);
      await vi.advanceTimersByTimeAsync(1);
    });
    view.unmount();
    expect(document.title).toBe('mini-jira');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(document.title).toBe('mini-jira');
  });

  it('requests fresh data on tab visibility and window focus even with fresh cache', async () => {
    renderHook(useNotificationSync, { wrapper: Wrapper });
    await waitFor(() =>
      expect(api.callsTo('GET', '/notifications')).toHaveLength(1),
    );
    api.on('GET', '/notifications', { ...response, unreadCount: 2 });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(window, new Event('visibilitychange'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(window, new Event('visibilitychange'));
    await waitFor(() =>
      expect(document.title).toBe('У вас новое уведомление (2)'),
    );
    api.on('GET', '/notifications', { ...response, unreadCount: 0 });
    fireEvent.focus(window);
    await waitFor(() => expect(document.title).toBe('mini-jira'));
    expect(api.callsTo('GET', '/notifications')).toHaveLength(3);
  });

  it('polls while active and does not poll in a hidden tab', async () => {
    vi.useFakeTimers();
    renderHook(useNotificationSync, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(api.callsTo('GET', '/notifications')).toHaveLength(2);
    act(() => {
      focusManager.setFocused(false);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(api.callsTo('GET', '/notifications')).toHaveLength(2);
  });
});

describe('notification inbox', () => {
  it('loads another page and returns to the first page after deleting its last item', async () => {
    api.on('GET', '/notifications', (call: { search: URLSearchParams }) => {
      const page = Number(call.search.get('page'));
      return {
        ...response,
        total: 21,
        page,
        items: [{ ...notification, boardName: `Страница ${String(page)}` }],
      };
    });
    api.on('DELETE', `/notifications/${notification.id}`, () => {
      api.on('GET', '/notifications', {
        ...response,
        page: 2,
        total: 20,
        items: [],
      });
      return new Response(null, { status: 204 });
    });
    render(<NotificationCenter />, { wrapper: Wrapper });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Уведомления, непрочитанных: 1',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    await screen.findByText(/Страница 2/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Удалить уведомление' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'К новым уведомлениям' }),
    );
    expect(api.unmatched).toEqual([]);
    expect(
      api
        .callsTo('GET', '/notifications')
        .some((call) => call.search.get('page') === '2'),
    ).toBe(true);
  });
  it('shows invitations, reads all and deletes with updated counters', async () => {
    api.on('PUT', '/notifications/read', () => {
      api.on('GET', '/notifications', {
        ...response,
        unreadCount: 0,
        items: [{ ...notification, readAt: notification.createdAt }],
      });
      return new Response(null, { status: 204 });
    });
    api.on('DELETE', `/notifications/${notification.id}`, () => {
      api.on('GET', '/notifications', {
        ...response,
        total: 0,
        unreadCount: 0,
        items: [],
      });
      return new Response(null, { status: 204 });
    });
    render(<NotificationCenter />, { wrapper: Wrapper });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Уведомления, непрочитанных: 1',
      }),
    );
    expect(screen.getByText(/Вас добавили на доску/)).toHaveTextContent(
      'Команда',
    );
    expect(screen.getByRole('link', { name: 'Открыть доску' })).toHaveAttribute(
      'href',
      '/boards/7',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Прочитать все' }));
    await screen.findByRole('button', {
      name: 'Уведомления, непрочитанных: 0',
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Удалить уведомление' }),
    );
    await screen.findByText('Уведомлений пока нет');
    expect(api.unmatched).toEqual([]);
  });

  it('keeps notifications unread when only opening the drawer and reads explicitly', async () => {
    api.on('PUT', `/notifications/${notification.id}/read`, undefined, {
      status: 204,
    });
    render(<NotificationCenter />, { wrapper: Wrapper });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Уведомления, непрочитанных: 1',
      }),
    );
    expect(api.callsTo('PUT', '/notifications/read')).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Прочитано' }));
    await waitFor(() =>
      expect(
        api.callsTo('PUT', `/notifications/${notification.id}/read`),
      ).toHaveLength(1),
    );
  });

  it('renders request errors and permits retry', async () => {
    api.on(
      'GET',
      '/notifications',
      { error: { code: 'INTERNAL_ERROR', message: 'Ошибка' } },
      { status: 500 },
    );
    render(<NotificationCenter />, { wrapper: Wrapper });
    fireEvent.click(
      screen.getByRole('button', { name: 'Уведомления, непрочитанных: 0' }),
    );
    await screen.findByRole('alert');
    api.on('GET', '/notifications', {
      ...response,
      total: 0,
      unreadCount: 0,
      items: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByText('Уведомлений пока нет');
  });

  it('rejects an invalid server response', async () => {
    api.on('GET', '/notifications', { ...response, unreadCount: -1 });
    await expect(
      client.fetchQuery(notificationsQueryOptions()),
    ).rejects.toThrow();
  });
});
