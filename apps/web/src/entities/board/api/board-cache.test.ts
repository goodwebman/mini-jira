// @vitest-environment node
/** Тесткейсы: звёздочка меняется во всех списках с разными фильтрами и в детали; чужие доски не трогаются; откат — обратная запись одного флага. */
import { describe, expect, it } from 'vitest';

import {
  createTestQueryClient,
  makeBoard,
  makeBoardListItem,
} from '@/shared/lib/testing';

import { setBoardFavoriteInCache, writeBoardFavorite } from './board-cache';
import { boardQueryKeys } from './boardQueries';

describe('избранное в кэше', () => {
  it('ставит флаг во всех списках и в детали и снимает его обратно', async () => {
    const client = createTestQueryClient();
    const target = makeBoardListItem({ id: 9 });
    const other = makeBoardListItem({ id: 11, key: 'FRONT' });
    client.setQueryData(boardQueryKeys.list({}), {
      items: [target, other],
      total: 2,
    });
    client.setQueryData(boardQueryKeys.list({ q: 'раз' }), {
      items: [target],
      total: 1,
    });
    client.setQueryData(boardQueryKeys.detail(9), makeBoard());

    await setBoardFavoriteInCache(client, 9, true);

    const flags = (key: readonly unknown[]) =>
      client
        .getQueryData<{ items: { isFavorite: boolean }[] }>(key)
        ?.items.map((item) => item.isFavorite);
    expect(flags(boardQueryKeys.list({}))).toEqual([true, false]);
    expect(flags(boardQueryKeys.list({ q: 'раз' }))).toEqual([true]);
    expect(client.getQueryData(boardQueryKeys.detail(9))).toMatchObject({
      isFavorite: true,
    });

    writeBoardFavorite(client, 9, false);
    expect(flags(boardQueryKeys.list({}))).toEqual([false, false]);
    expect(client.getQueryData(boardQueryKeys.detail(9))).toMatchObject({
      isFavorite: false,
    });
  });
});
