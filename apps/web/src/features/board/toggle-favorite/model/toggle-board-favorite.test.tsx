/** Тесткейсы: звёздочка сразу меняется в списке и уходит PUT; ошибка сервера возвращает её обратно; снятие — DELETE. */
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { boardQueryKeys } from '@/entities/board';
import { configureApiTransport } from '@/shared/api';
import {
  type ApiMock,
  TestProviders,
  apiError,
  createApiMock,
  createTestQueryClient,
  makeBoardListItem,
} from '@/shared/lib/testing';

import { useToggleBoardFavorite } from './use-toggle-board-favorite';

let api: ApiMock;
const client = createTestQueryClient();
const wrapper = ({ children }: { children: ReactNode }) => (
  <TestProviders client={client}>{children}</TestProviders>
);
const favorite = () =>
  client.getQueryData<{ items: { isFavorite: boolean }[] }>(
    boardQueryKeys.list({}),
  )?.items[0]?.isFavorite;

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  api = createApiMock().on('GET', '/boards', { items: [], total: 0 });
  configureApiTransport(api.fetch);
  client.clear();
  client.setQueryData(boardQueryKeys.list({}), {
    items: [makeBoardListItem({ id: 9, isFavorite: false })],
    total: 1,
  });
});

describe('useToggleBoardFavorite', () => {
  it('ставит звёздочку сразу и отправляет PUT', async () => {
    let release: () => void = () => {};
    api.on('PUT', '/boards/9/favorite', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return new Response(null, { status: 204 });
    });
    const { result } = renderHook(() => useToggleBoardFavorite(), { wrapper });
    act(() => result.current.toggle(9, true));
    await waitFor(() => expect(favorite()).toBe(true));
    expect(result.current.pendingBoardId).toBe(9);
    act(() => release());
    await waitFor(() => expect(result.current.pendingBoardId).toBeNull());
  });

  it('ошибка сервера возвращает звёздочку', async () => {
    api.on('DELETE', '/boards/9/favorite', apiError('BOARD_NOT_FOUND'), {
      status: 404,
    });
    client.setQueryData(boardQueryKeys.list({}), {
      items: [makeBoardListItem({ id: 9, isFavorite: true })],
      total: 1,
    });
    const { result } = renderHook(() => useToggleBoardFavorite(), { wrapper });
    act(() => result.current.toggle(9, false));
    await waitFor(() =>
      expect(api.callsTo('DELETE', '/boards/9/favorite')).toHaveLength(1),
    );
    await waitFor(() => expect(favorite()).toBe(true));
  });
});
