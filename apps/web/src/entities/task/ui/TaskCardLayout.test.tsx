import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskCardLayout } from './TaskCardLayout';

describe('TaskCardLayout', () => {
  it('ссылка подписана ключом и названием', () => {
    render(<TaskCardLayout taskKey='MJ-1' title='Задача' href='/task/1' />);
    expect(
      screen.getByRole('link', { name: 'Открыть задачу MJ-1: Задача' }),
    ).toHaveAttribute('href', '/task/1');
  });

  it('поддерживает роутерную ссылку через render', () => {
    render(
      <TaskCardLayout
        taskKey='MJ-1'
        title='Задача'
        render={<a href='/router' data-router='' />}
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-router');
  });

  it('пробрасывает drag-обработчики на карточку', () => {
    const onDragStart = vi.fn();
    render(
      <TaskCardLayout
        taskKey='MJ-1'
        title='Задача'
        href='/t'
        draggable
        onDragStart={onDragStart}
      />,
    );
    fireEvent.dragStart(screen.getByRole('article'));
    expect(onDragStart).toHaveBeenCalledOnce();
  });
});
