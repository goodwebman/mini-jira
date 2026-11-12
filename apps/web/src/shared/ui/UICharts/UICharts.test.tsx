import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createPlot,
  linePath,
  niceScale,
  pointX,
  xLabelStep,
} from './chart-utils';
import {
  UIAreaChart,
  UIBarChart,
  UIChartLegend,
  UIDonutChart,
  UILineChart,
} from './index';

const margin = { left: 30, right: 10, top: 10, bottom: 20 };

describe('niceScale', () => {
  it.each([
    [64, 80, 20],
    [100, 100, 50],
    [7, 8, 2],
    [1, 1, 1],
  ])('max %d → top %d, step %d', (max, top, step) => {
    expect(niceScale(max)).toEqual({ top, step });
  });

  it('пустые данные не ломают ось', () => {
    expect(niceScale(0)).toEqual({ top: 1, step: 1 });
    expect(niceScale(Number.NaN).top).toBeGreaterThan(0);
  });
});

describe('chart-utils', () => {
  const plot = createPlot(340, 130, margin, 10);

  it('нулевое значение лежит на базовой линии', () => {
    expect(plot.y(0)).toBe(plot.baseline);
  });

  it('деления оси начинаются с нуля и доходят до верха', () => {
    expect(plot.ticks[0]).toBe(0);
    expect(plot.y(plot.ticks[plot.ticks.length - 1])).toBe(margin.top);
  });

  it('единственная точка встаёт по центру', () => {
    expect(pointX(plot, 0, 1)).toBe(margin.left + plot.plotWidth / 2);
  });

  it('null разрывает линию', () => {
    const path = linePath(plot, [1, null, 3], 3);
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path).not.toContain('L');
  });

  it('на узких графиках подписей меньше', () => {
    expect(xLabelStep(300)).toBe(3);
    expect(xLabelStep(500)).toBe(2);
    expect(xLabelStep(800)).toBe(1);
  });
});

describe('UILineChart', () => {
  const props = {
    ariaLabel: 'Сгорание',
    labels: ['А', 'Б', 'В'],
    series: [{ name: 'Факт', values: [10, 5, null] }],
  };

  it('подписан для скринридера', () => {
    render(<UILineChart {...props} />);
    expect(screen.getByRole('img', { name: 'Сгорание' })).toBeInTheDocument();
  });

  it('не падает без данных', () => {
    render(<UILineChart ariaLabel='Пусто' labels={[]} series={[]} />);
    expect(screen.getByRole('img', { name: 'Пусто' })).toBeInTheDocument();
  });

  it('подсказка появляется при наведении и исчезает при уходе', () => {
    render(
      <UILineChart {...props} formatValue={(value) => `${String(value)} SP`} />,
    );
    const chart = screen.getByRole('img', { name: 'Сгорание' });
    // В jsdom rect нулевой: clientX=0 попадает на первую точку
    fireEvent.pointerMove(chart, { clientX: 0 });
    expect(screen.getByText('10 SP')).toBeInTheDocument();
    fireEvent.pointerLeave(chart);
    expect(screen.queryByText('10 SP')).not.toBeInTheDocument();
  });
});

describe('UIAreaChart и UIBarChart', () => {
  it('не падают на пустых и неполных данных', () => {
    render(
      <>
        <UIAreaChart ariaLabel='Поток' labels={[]} series={[]} />
        <UIAreaChart
          ariaLabel='Поток 2'
          labels={['А', 'Б']}
          series={[{ name: 'С', values: [1, null] }]}
        />
        <UIBarChart
          ariaLabel='Скорость'
          labels={[]}
          series={[]}
          highlightIndex={3}
        />
        <UIBarChart
          ariaLabel='Скорость 2'
          labels={['С1']}
          series={[{ name: 'План', values: [0] }]}
        />
      </>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(4);
  });

  it('выделенная группа подписывает значение, средняя — свою линию', () => {
    render(
      <UIBarChart
        ariaLabel='Скорость'
        labels={['С1', 'С2']}
        highlightIndex={1}
        average={{ value: 5, label: 'Средняя: 5' }}
        series={[{ name: 'Факт', values: [4, 7] }]}
      />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Средняя: 5')).toBeInTheDocument();
  });
});

describe('UIDonutChart', () => {
  const arcs = (container: HTMLElement) =>
    container.querySelectorAll('svg path');

  it('рисует только положительные сегменты', () => {
    const { container } = render(
      <UIDonutChart
        ariaLabel='Статус'
        segments={[
          { label: 'А', value: 3 },
          { label: 'Б', value: 0 },
          { label: 'В', value: -1 },
        ]}
      />,
    );
    expect(arcs(container)).toHaveLength(1);
  });

  it('при нуле показывает только трек', () => {
    const { container } = render(
      <UIDonutChart ariaLabel='Статус' segments={[{ label: 'А', value: 0 }]} />,
    );
    expect(arcs(container)).toHaveLength(0);
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('показывает значение в центре', () => {
    render(
      <UIDonutChart
        ariaLabel='Статус'
        segments={[]}
        value='42%'
        caption='закрыто'
      />,
    );
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('закрыто')).toBeInTheDocument();
  });
});

describe('UIChartLegend', () => {
  it('в режиме list показывает значения', () => {
    render(
      <UIChartLegend
        variant='list'
        items={[{ label: 'Готово', color: 'red', value: '5 SP' }]}
      />,
    );
    expect(screen.getByText('5 SP')).toBeInTheDocument();
  });
});
