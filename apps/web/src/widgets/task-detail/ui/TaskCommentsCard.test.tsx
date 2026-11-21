import type { TaskComment, TaskDetail } from '@gwmt/contracts';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskQueryKeys } from '@/entities/task';
import { configureApiTransport } from '@/shared/api';
import { copyText } from '@/shared/lib/dom';
import {
  TestProviders,
  createApiMock,
  createTestQueryClient,
  makeTaskDetail,
  users,
} from '@/shared/lib/testing';

import { TaskCommentsCard } from './TaskCommentsCard';

vi.mock('@/shared/lib/dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/dom')>()),
  copyText: vi.fn(),
}));

const root: TaskComment = {
  id: '11111111-1111-4111-8111-111111111111',
  parentId: null,
  author: users.anna,
  text: 'Первый комментарий',
  createdAt: '2026-11-11T00:00:00Z',
};
const reply: TaskComment = {
  ...root,
  id: '22222222-2222-4222-8222-222222222222',
  parentId: root.id,
  author: users.ivan,
  text: 'Вложенный ответ',
};
const task = makeTaskDetail({ comments: [root, reply] });
const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  scrollIntoView.mockClear();
  vi.mocked(copyText).mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(
  canComment = true,
  commentTarget?: { hash: string; key: string },
) {
  const client = createTestQueryClient();
  client.setQueryData(taskQueryKeys.detail(task.key), task);
  const api = createApiMock();
  configureApiTransport(api.fetch);
  const view = (target = commentTarget) => (
    <TestProviders client={client}>
      <TaskCommentsCard
        task={{ ...task, myRole: canComment ? task.myRole : 'guest' }}
        currentUserId={users.anna.id}
        canComment={canComment}
        timeZone='UTC'
        commentTarget={target}
      />
    </TestProviders>
  );
  return { ...render(view()), api, client, view };
}

describe('TaskCommentsCard', () => {
  it.each([root, reply])(
    'отправляет ответ на комментарий $text и обновляет кэш',
    async (parent) => {
      const { api, client } = setup();
      const created = {
        ...reply,
        id: '33333333-3333-4333-8333-333333333333',
        parentId: parent.id,
        text: 'Новый ответ',
      };
      api.on('POST', `/tasks/${task.key}/comments`, created, { status: 201 });
      const row = document.getElementById(`comment-${parent.id}`)!;
      fireEvent.click(within(row).getByRole('button', { name: 'Ответить' }));
      fireEvent.change(within(row).getByLabelText('Ответ на комментарий'), {
        target: { value: ' Новый ответ ' },
      });
      fireEvent.click(within(row).getByRole('button', { name: 'Отправить' }));
      await waitFor(() =>
        expect(within(row).queryByLabelText('Ответ на комментарий')).toBeNull(),
      );
      expect(
        api.callsTo('POST', `/tasks/${task.key}/comments`)[0]?.body,
      ).toEqual({ text: 'Новый ответ', parentId: parent.id });
      expect(
        client.getQueryData<TaskDetail>(taskQueryKeys.detail(task.key))
          ?.comments,
      ).toContainEqual(created);
    },
  );

  it('ошибка не теряет текст ответа, отмена закрывает форму', async () => {
    const { api } = setup();
    api.on(
      'POST',
      `/tasks/${task.key}/comments`,
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Не удалось отправить',
          requestId: 'test',
        },
      },
      { status: 422 },
    );
    const row = document.getElementById(`comment-${root.id}`)!;
    fireEvent.click(within(row).getByRole('button', { name: 'Ответить' }));
    fireEvent.change(within(row).getByLabelText('Ответ на комментарий'), {
      target: { value: 'Мой ответ' },
    });
    fireEvent.click(within(row).getByRole('button', { name: 'Отправить' }));
    expect(
      await within(row).findByText('Не удалось отправить'),
    ).toBeInTheDocument();
    expect(within(row).getByLabelText('Ответ на комментарий')).toHaveValue(
      'Мой ответ',
    );
    fireEvent.click(within(row).getByRole('button', { name: 'Отмена' }));
    expect(within(row).queryByLabelText('Ответ на комментарий')).toBeNull();
  });

  it('гость может копировать ссылку, но не отвечать', async () => {
    setup(false);
    expect(screen.queryByRole('button', { name: 'Ответить' })).toBeNull();
    expect(screen.queryByLabelText('Новый комментарий')).toBeNull();
    fireEvent.click(
      within(document.getElementById(`comment-${reply.id}`)!).getByRole(
        'button',
        { name: 'Скопировать ссылку на комментарий' },
      ),
    );
    await waitFor(() =>
      expect(copyText).toHaveBeenCalledWith(
        `${location.origin}/tasks/${task.key}#comment-${reply.id}`,
      ),
    );
    expect(
      await screen.findByText('Ссылка на комментарий скопирована'),
    ).toBeInTheDocument();
  });

  it('показывает ссылку для ручного копирования при отказе буфера', async () => {
    vi.mocked(copyText).mockResolvedValue(false);
    setup(false);
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Скопировать ссылку на комментарий',
      })[0]!,
    );
    expect(
      await screen.findByText(
        `Скопируйте вручную: ${location.origin}/tasks/${task.key}#comment-${root.id}`,
      ),
    ).toBeInTheDocument();
  });

  it('прокручивает к вложенному комментарию и подсвечивает ровно 5 секунд, повторный переход запускает заново', () => {
    vi.useFakeTimers();
    const target = { hash: `#comment-${reply.id}`, key: 'first' };
    const { rerender, view } = setup(false, target);
    const element = document.getElementById(`comment-${reply.id}`)!;
    const rootElement = document.getElementById(`comment-${root.id}`)!;
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(element).toHaveFocus();
    expect(element).toHaveAttribute('data-highlighted', 'true');
    expect(rootElement).not.toHaveAttribute('data-highlighted');
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    rerender(view({ ...target }));
    expect(element).toHaveAttribute('data-highlighted', 'true');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(element).not.toHaveAttribute('data-highlighted');
    rerender(view({ ...target, key: 'second' }));
    expect(element).toHaveAttribute('data-highlighted', 'true');
    rerender(view({ hash: `#comment-${root.id}`, key: 'third' }));
    expect(element).not.toHaveAttribute('data-highlighted');
    expect(rootElement).toHaveAttribute('data-highlighted', 'true');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(rootElement).not.toHaveAttribute('data-highlighted');
  });

  it('неизвестный якорь не прокручивает и не подсвечивает комментарии', () => {
    setup(false, { hash: '#comment-missing', key: 'missing' });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.querySelector('[data-highlighted]')).toBeNull();
  });
});
