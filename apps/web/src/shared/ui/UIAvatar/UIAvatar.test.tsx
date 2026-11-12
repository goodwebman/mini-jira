import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getInitials, getTintByName } from './avatar-utils';
import { UIAvatar } from './index';

describe('getInitials', () => {
  it.each([
    ['Анна Соколова', 'АС'],
    ['анна', 'А'],
    ['  Иван   Петров  Сидорович ', 'ИП'],
    ['', ''],
  ])('%s → %s', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});

describe('getTintByName', () => {
  it('для одного имени всегда один цвет', () => {
    expect(getTintByName('Анна Соколова')).toBe(getTintByName('Анна Соколова'));
  });
});

describe('UIAvatar', () => {
  it('показывает инициалы и подписан именем', () => {
    render(<UIAvatar name='Анна Соколова' />);
    expect(
      screen.getByRole('img', { name: 'Анна Соколова' }),
    ).toHaveTextContent('АС');
  });

  it('при ошибке загрузки фото возвращается к инициалам', () => {
    const { container } = render(
      <UIAvatar name='Анна Соколова' src='/a.png' />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img')).toHaveTextContent('АС');
  });

  it('новое фото пробует загрузиться заново после ошибки старого', () => {
    const { container, rerender } = render(
      <UIAvatar name='Анна' src='/a.png' />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    rerender(<UIAvatar name='Анна' src='/b.png' />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/b.png');
  });

  it('Group сворачивает лишних в счётчик', () => {
    render(
      <UIAvatar.Group max={2}>
        <UIAvatar name='А Б' />
        <UIAvatar name='В Г' />
        <UIAvatar name='Д Е' />
        <UIAvatar name='Ж З' />
      </UIAvatar.Group>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('Group без переполнения счётчик не показывает', () => {
    render(
      <UIAvatar.Group max={3}>
        <UIAvatar name='А Б' />
      </UIAvatar.Group>,
    );
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
