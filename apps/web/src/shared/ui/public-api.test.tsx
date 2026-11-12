import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as ui from './index';
import {
  UIBadge,
  UIIcons,
  UIKanbanColumn,
  UIProgress,
  UISideNav,
  UITable,
  UITaskCard,
} from './index';

describe('публичный API', () => {
  it('ни один экспорт не потерялся', () => {
    for (const [name, value] of Object.entries(ui)) {
      expect(value, name).toBeDefined();
    }
  });

  it('иконки декоративны по умолчанию и озвучиваются при наличии имени', () => {
    const { container, rerender } = render(<UIIcons.Check />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    rerender(<UIIcons.Check title='Готово' />);
    expect(screen.getByRole('img', { name: 'Готово' })).toBeInTheDocument();
  });
});

describe('UIProgress', () => {
  it.each([
    [150, '100'],
    [-5, '0'],
    [Number.NaN, '0'],
  ])('значение %d приводится к границам', (value, expected) => {
    render(<UIProgress value={value} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      expected,
    );
  });

  it('нулевой max не ломает ширину', () => {
    const { container } = render(<UIProgress value={5} max={0} />);
    const indicator = container.querySelector(
      '[role="progressbar"] > div',
    ) as HTMLElement;
    expect(indicator.style.width).toBe('5%');
  });
});

describe('UIBadge', () => {
  it('рендерит иконку и текст', () => {
    const { container } = render(
      <UIBadge tone='warning' icon={<UIIcons.Lock />}>
        Запрет
      </UIBadge>,
    );
    expect(screen.getByText('Запрет')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="lock"]')).toBeInTheDocument();
  });
});

describe('UITaskCard', () => {
  it('ссылка подписана ключом и названием', () => {
    render(<UITaskCard taskKey='MJ-1' title='Задача' href='/task/1' />);
    expect(
      screen.getByRole('link', { name: 'Открыть задачу MJ-1: Задача' }),
    ).toHaveAttribute('href', '/task/1');
  });

  it('поддерживает роутерную ссылку через render', () => {
    render(
      <UITaskCard
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
      <UITaskCard
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

describe('UIKanbanColumn', () => {
  it('пустая колонка показывает текст, с карточками — нет', () => {
    const { rerender } = render(
      <UIKanbanColumn status='todo' title='К работе' />,
    );
    expect(screen.getByText('Нет задач')).toBeInTheDocument();
    rerender(
      <UIKanbanColumn status='todo' title='К работе'>
        <div>карточка</div>
      </UIKanbanColumn>,
    );
    expect(screen.queryByText('Нет задач')).not.toBeInTheDocument();
  });

  it('кнопка добавления есть только с onAdd', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <UIKanbanColumn status='todo' title='К работе' />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<UIKanbanColumn status='todo' title='К работе' onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить задачу' }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('сообщает о состоянии перетаскивания', () => {
    render(<UIKanbanColumn status='todo' title='К работе' dropState='bad' />);
    expect(screen.getByRole('region', { name: 'К работе' })).toHaveAttribute(
      'data-drop',
      'bad',
    );
  });
});

describe('UITable', () => {
  it('выделяет строку и даёт ссылку на всю строку', () => {
    render(
      <UITable>
        <UITable.Body>
          <UITable.Row selected data-testid='row'>
            <UITable.Cell>
              <UITable.RowLink href='/r'>MJ-1</UITable.RowLink>
            </UITable.Cell>
          </UITable.Row>
        </UITable.Body>
      </UITable>,
    );
    expect(screen.getByTestId('row')).toHaveAttribute('data-selected');
    expect(screen.getByRole('link', { name: 'MJ-1' })).toHaveAttribute(
      'href',
      '/r',
    );
  });
});

describe('UISideNav', () => {
  it('отмечает текущий раздел и рендерит роутерную ссылку', () => {
    render(
      <UISideNav.Tile
        active
        icon={<UIIcons.Board />}
        label='Доски'
        value={3}
        render={<a href='/boards' />}
      />,
    );
    expect(screen.getByRole('link', { name: 'Доски' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('спарклайну нужно минимум две точки', () => {
    const { container, rerender } = render(<UISideNav.SparkViz values={[1]} />);
    expect(container.querySelector('svg')).toBeNull();
    rerender(<UISideNav.SparkViz values={[1, 2]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('мини-доска ограничивает количество плашек', () => {
    const { container } = render(<UISideNav.BoardViz columns={[100]} />);
    expect(container.querySelectorAll('[class*="h-[9px]"]')).toHaveLength(6);
  });
});
