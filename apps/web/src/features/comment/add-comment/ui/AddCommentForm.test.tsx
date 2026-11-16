import type { CreateCommentBody } from '@gwmt/contracts';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';
import {
  type MockCall,
  TestProviders,
  createApiMock,
  createTestQueryClient,
  makeBoard,
  users,
} from '@/shared/lib/testing';

import { AddCommentForm } from './AddCommentForm';

beforeEach(() => vi.stubEnv('VITE_API_URL', '/api/v1'));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function setup() {
  const api = createApiMock()
    .on('GET', '/boards/9', makeBoard())
    .on(
      'POST',
      '/tasks/GWT-101/comments',
      (call: MockCall) => ({
        ...(call.body as CreateCommentBody),
        id: users.anna.id,
        parentId: null,
        author: users.anna,
        createdAt: '2026-11-16T09:00:00Z',
      }),
      { status: 201 },
    );
  configureApiTransport(api.fetch);
  const client = createTestQueryClient();
  render(
    <TestProviders client={client}>
      <AddCommentForm taskKey='GWT-101' boardId={9} />
    </TestProviders>,
  );
  const input = screen.getByLabelText('Новый комментарий');
  const type = (value: string) =>
    fireEvent.change(input, {
      target: { value, selectionStart: value.length },
    });
  return { api, client, input, type };
}

describe('comment @ mentions', () => {
  it('disables sending empty or whitespace comments and disables again after success', async () => {
    const { api, input, type } = setup();
    const button = screen.getByRole('button', { name: 'Отправить' });
    expect(button).toBeDisabled();
    type('  \n\t ');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.submit(button.closest('form')!);
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toEqual([]);
    type('Комментарий');
    expect(button).toBeEnabled();
    type('');
    expect(button).toBeDisabled();
    type('Комментарий');
    fireEvent.click(button);
    await waitFor(() => expect(input).toHaveValue(''));
    expect(button).toBeDisabled();
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toHaveLength(1);
  });
  it('loads only board members on @, permits guests, and submits an ID with normalized text offsets', async () => {
    const { api, input, type } = setup();
    expect(api.calls).toEqual([]);
    type('  @');
    await screen.findByRole('listbox');
    const guest = await screen.findByRole('option', {
      name: new RegExp(users.viktoria.name),
    });
    expect(
      screen.queryByRole('option', { name: new RegExp(users.dmitry.name) }),
    ).toBeNull();
    fireEvent.click(guest);
    expect(input).toHaveValue(`  @${users.viktoria.name} `);
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() =>
      expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toHaveLength(1),
    );
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')[0]!.body).toEqual({
      text: `@${users.viktoria.name}`,
      mentions: [
        {
          userId: users.viktoria.id,
          start: 0,
          end: users.viktoria.name.length + 1,
        },
      ],
    });
    await waitFor(() => expect(input).toHaveValue(''));
    expect(api.unmatched).toEqual([]);
  });

  it('supports searching and keyboard selection without submitting the form on Enter', async () => {
    const { api, input, type } = setup();
    type('@');
    await screen.findByRole('option', { name: new RegExp(users.anna.name) });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue(`@${users.ivan.name} `);
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toEqual([]);
    type('@Еле');
    await screen.findByRole('option', { name: new RegExp(users.elena.name) });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('removes the tag when its visible text is edited', async () => {
    const { api, input, type } = setup();
    type('@Ан');
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(users.anna.name) }),
    );
    type('@Другое имя');
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() =>
      expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toHaveLength(1),
    );
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')[0]!.body).toEqual({
      text: '@Другое имя',
    });
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('preserves comment text and tags after a server error', async () => {
    const { api, input, type } = setup();
    api.on(
      'POST',
      '/tasks/GWT-101/comments',
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Участник больше не на доске',
          requestId: 'test',
        },
      },
      { status: 422 },
    );
    type('@Ан');
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(users.anna.name) }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await screen.findByText('Участник больше не на доске');
    expect(input).toHaveValue(`@${users.anna.name} `);
  });

  it('shows empty results and board loading failures without offering outsiders', async () => {
    const { api, type } = setup();
    type('@Никого');
    await screen.findByText('Участники не найдены');
    api.on(
      'GET',
      '/boards/9',
      { error: { code: 'BOARD_NOT_FOUND' } },
      { status: 404 },
    );
    type('обычный текст');
    type('@');
    await screen.findByRole('alert');
    expect(api.callsTo('POST', '/tasks/GWT-101/comments')).toEqual([]);
  });
});
