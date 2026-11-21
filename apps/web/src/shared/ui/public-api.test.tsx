import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as ui from './index';
import { UIBadge, UIIcons, UIProgress, UISideNav, UITable } from './index';

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
