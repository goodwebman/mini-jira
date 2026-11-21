import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KanbanColumn } from './KanbanColumn';

describe('KanbanColumn', () => {
  it('в пустой колонке показывает иллюстрацию с доступным именем', () => {
    const { rerender } = render(
      <KanbanColumn status='todo' title='К работе' />,
    );
    expect(screen.getByRole('img', { name: 'Нет задач' })).toBeInTheDocument();
    rerender(
      <KanbanColumn status='todo' title='К работе'>
        <div>карточка</div>
      </KanbanColumn>,
    );
    expect(screen.queryByRole('img', { name: 'Нет задач' })).toBeNull();
  });

  it('кнопка добавления есть только с onAdd', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <KanbanColumn status='todo' title='К работе' />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<KanbanColumn status='todo' title='К работе' onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить задачу' }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('сообщает о состоянии перетаскивания', () => {
    render(<KanbanColumn status='todo' title='К работе' dropState='bad' />);
    expect(screen.getByRole('region', { name: 'К работе' })).toHaveAttribute(
      'data-drop',
      'bad',
    );
  });
});
