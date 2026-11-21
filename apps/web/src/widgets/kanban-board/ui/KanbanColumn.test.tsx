import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KanbanColumn } from './KanbanColumn';

describe('KanbanColumn', () => {
  it('пустая колонка показывает текст, с карточками — нет', () => {
    const { rerender } = render(
      <KanbanColumn status='todo' title='К работе' />,
    );
    expect(screen.getByText('Нет задач')).toBeInTheDocument();
    rerender(
      <KanbanColumn status='todo' title='К работе'>
        <div>карточка</div>
      </KanbanColumn>,
    );
    expect(screen.queryByText('Нет задач')).not.toBeInTheDocument();
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
