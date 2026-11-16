import type { ReactElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBoardDialog } from '@/features/board/create-board';
import { ChangePasswordForm } from '@/features/profile/change-password';
import { ProfileForm } from '@/features/profile/edit-profile';
import { LinkTaskDialog } from '@/features/task/link-tasks';
import { configureApiTransport } from '@/shared/api';
import {
  TestProviders,
  createApiMock,
  createTestQueryClient,
  makeMe,
  users,
} from '@/shared/lib/testing';

beforeEach(() => vi.stubEnv('VITE_API_URL', '/api/v1'));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const show = (element: ReactElement) =>
  render(
    <MemoryRouter>
      <TestProviders client={createTestQueryClient()}>{element}</TestProviders>
    </MemoryRouter>,
  );
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('form submission availability', () => {
  it('requires a board name and key while allowing an empty description and no invited members', async () => {
    const api = createApiMock().on('GET', '/users/search', { items: [] });
    configureApiTransport(api.fetch);
    show(
      <CreateBoardDialog
        open
        onOpenChange={vi.fn()}
        currentUser={users.anna}
      />,
    );
    const button = await screen.findByRole('button', { name: 'Создать доску' });
    expect(button).toBeDisabled();
    fill('Название', '   ');
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest('form')!);
    expect(api.callsTo('POST', '/boards')).toHaveLength(0);
    fill('Название', 'Команда');
    fill('Ключ задач', 'TEAM');
    expect(button).toBeEnabled();
    fill('Ключ задач', '');
    expect(button).toBeDisabled();
  });

  it('requires selecting a target before linking a task', async () => {
    const api = createApiMock().on('GET', '/tasks/search', {
      items: [
        {
          key: 'GWT-102',
          title: 'Связанная задача',
          status: 'todo',
          board: { id: 9, name: 'Команда' },
        },
      ],
    });
    configureApiTransport(api.fetch);
    show(<LinkTaskDialog open taskKey='GWT-101' onOpenChange={vi.fn()} />);
    const button = await screen.findByRole('button', { name: 'Связать' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(api.callsTo('POST', '/tasks/GWT-101/links')).toHaveLength(0);
    fireEvent.click(
      await screen.findByRole('button', { name: /Связанная задача/ }),
    );
    expect(button).toBeEnabled();
  });

  it('requires profile changes and filled mandatory fields but allows clearing the job', () => {
    configureApiTransport(createApiMock().fetch);
    const me = makeMe({ job: 'Разработчик' });
    show(<ProfileForm me={me} />);
    const button = screen.getByRole('button', { name: 'Сохранить' });
    expect(button).toBeDisabled();
    fill('Имя и фамилия', ` ${me.name} `);
    expect(button).toBeDisabled();
    fill('Должность', '');
    expect(button).toBeEnabled();
    fill('Имя и фамилия', '   ');
    expect(button).toBeDisabled();
    fill('Имя и фамилия', me.name);
    expect(button).toBeEnabled();
    fill('Должность', me.job);
    expect(button).toBeDisabled();
    fill('Email', '');
    expect(button).toBeDisabled();
  });

  it.each([true, false])(
    'requires password fields according to account type (hasPassword=%s)',
    async (hasPassword) => {
      const api = createApiMock().on('POST', '/me/password', undefined, {
        status: 204,
      });
      configureApiTransport(api.fetch);
      show(<ChangePasswordForm hasPassword={hasPassword} />);
      const button = screen.getByRole('button', { name: 'Сменить пароль' });
      expect(button).toBeDisabled();
      fill('Новый пароль', 'new-password');
      fill('Повторите пароль', '   ');
      expect(button).toBeDisabled();
      fill('Повторите пароль', 'new-password');
      if (hasPassword) {
        expect(button).toBeDisabled();
        fill('Текущий пароль', 'old-password');
      }
      expect(button).toBeEnabled();
      fireEvent.click(button);
      await waitFor(() =>
        expect(screen.getByLabelText('Новый пароль')).toHaveValue(''),
      );
      expect(button).toBeDisabled();
      expect(api.callsTo('POST', '/me/password')).toHaveLength(1);
    },
  );
});
