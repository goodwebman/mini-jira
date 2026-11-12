import { type PointerEvent, memo, useState } from 'react';

import { cn } from '@/shared/lib/cn';

import { ChartAxes } from './ChartAxes';
import { UIChartTooltip } from './UIChartTooltip';
import {
  type ChartPlot,
  clampIndex,
  createPlot,
  gridPath,
  maxOf,
  seriesColor,
} from './chart-utils';
import { useChartBox } from './use-chart-box';

export interface IUIBarChartSeries {
  readonly name: string;
  readonly values: readonly number[];
  readonly color?: string;
  /** Цвет столбцов вне `highlightIndex`. */
  readonly mutedColor?: string;
}

export interface IUIBarChartProps {
  readonly ariaLabel: string;
  readonly labels: readonly string[];
  readonly series: readonly IUIBarChartSeries[];
  /** Выделенная группа, например текущий спринт: фон и подпись значения. */
  readonly highlightIndex?: number;
  /** Опорная линия, например средняя скорость. */
  readonly average?: { readonly value: number; readonly label: string };
  readonly height?: number;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

const BAR_GAP = 2;
const BAR_RADIUS = 4;
/** Минимум групп в расчёте ширины: при одном спринте столбец не раздуется на весь график. */
const MIN_SLOTS = 6;

/** Столбец со скруглением сверху. */
function barPath(
  plot: ChartPlot,
  x: number,
  barWidth: number,
  value: number,
): string {
  if (value <= 0) {
    return '';
  }
  const top = plot.y(value);
  const radius = Math.min(BAR_RADIUS, barWidth / 2, plot.baseline - top);
  return [
    `M${String(x)} ${String(plot.baseline)}`,
    `V${String(top + radius)}`,
    `Q${String(x)} ${String(top)} ${String(x + radius)} ${String(top)}`,
    `H${String(x + barWidth - radius)}`,
    `Q${String(x + barWidth)} ${String(top)} ${String(x + barWidth)} ${String(top + radius)}`,
    `V${String(plot.baseline)}Z`,
  ].join('');
}

/**
 * Столбчатый график с группами: план и факт по спринтам.
 *
 * @example
 * <UIBarChart
 *   ariaLabel="Скорость команды"
 *   labels={['С7', 'С8', 'С9']}
 *   highlightIndex={2}
 *   series={[
 *     { name: 'План', values: plan, color: 'var(--chart-plan)' },
 *     { name: 'Выполнено', values: done, color: 'var(--chart-1)', mutedColor: 'var(--chart-soft)' },
 *   ]}
 * />
 */
function UIBarChartBase({
  ariaLabel,
  labels,
  series,
  highlightIndex,
  average,
  height: heightProp,
  formatValue = String,
  className,
}: IUIBarChartProps) {
  const { ref, width, height, unit } = useChartBox('regular', heightProp);
  const [hovered, setHovered] = useState<number | null>(null);

  const count = labels.length;
  const plot = createPlot(
    width,
    height,
    {
      left: Math.round(30 * unit),
      right: 8,
      top: Math.round(22 * unit),
      bottom: Math.round(24 * unit),
    },
    Math.max(
      ...series.map(({ values }) => maxOf(values)),
      average?.value ?? 0,
      0,
    ),
  );

  const slot = plot.plotWidth / Math.max(count, MIN_SLOTS);
  const barCount = Math.max(1, series.length);
  const barWidth = Math.min(
    Math.round(24 * unit),
    Math.floor((slot * 0.6) / barCount),
  );
  const groupWidth = barCount * barWidth + (barCount - 1) * BAR_GAP;
  const groupX = (index: number) =>
    plot.margin.left + slot * index + (slot - groupWidth) / 2;
  const barX = (index: number, bar: number) =>
    groupX(index) + bar * (barWidth + BAR_GAP);
  const slotCenter = (index: number) =>
    plot.margin.left + slot * index + slot / 2;

  const active = hovered != null && hovered < count ? hovered : null;
  const highlighted =
    highlightIndex != null && highlightIndex < count ? highlightIndex : null;
  const labelBar = series.length - 1;
  const highlightedValue =
    highlighted != null ? series[labelBar]?.values[highlighted] : undefined;
  // Над выделенным столбцом своя подпись: подпись средней уводим на другой край
  const averageOnLeft = highlighted != null && highlighted >= count / 2;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      (event.clientX - rect.left - plot.margin.left) / slot,
    );
    setHovered(clampIndex(index, count));
  };

  return (
    <div
      ref={ref}
      role='img'
      aria-label={ariaLabel}
      data-name='UIBarChart'
      className={cn('relative w-full touch-pan-y', className)}
      style={{ height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        setHovered(null);
      }}
    >
      <svg
        aria-hidden='true'
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className='absolute inset-0 block size-full overflow-visible'
      >
        <path
          d={gridPath(plot)}
          fill='none'
          stroke='var(--border)'
          strokeWidth={1}
        />
        {highlighted != null && (
          <rect
            x={plot.margin.left + slot * highlighted}
            y={plot.margin.top}
            width={slot}
            height={plot.plotHeight}
            fill='var(--chart-band)'
          />
        )}
        {series.map((item, bar) =>
          item.values.slice(0, count).map((value, index) => {
            const base = seriesColor(bar, item.color);
            const muted =
              highlighted != null &&
              index !== highlighted &&
              item.mutedColor != null;
            return (
              <path
                key={`${item.name}-${String(index)}`}
                d={barPath(plot, barX(index, bar), barWidth, value)}
                fill={muted ? item.mutedColor : base}
              />
            );
          }),
        )}
        {average != null && (
          <path
            d={`M${String(plot.margin.left)} ${String(plot.y(average.value))}H${String(plot.margin.left + plot.plotWidth)}`}
            fill='none'
            stroke='var(--foreground)'
            strokeWidth={1.5}
            strokeDasharray='5 4'
          />
        )}
      </svg>

      <ChartAxes
        plot={plot}
        unit={unit}
        xLabels={labels.map((text, index) => ({
          x: slotCenter(index),
          text,
          first: false,
          strong: index === highlighted,
        }))}
      />

      {highlighted != null &&
        highlightedValue != null &&
        highlightedValue > 0 && (
          <span
            className='pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-caption font-semibold text-foreground'
            style={{
              left: barX(highlighted, labelBar) + barWidth / 2,
              top: plot.y(highlightedValue) - Math.round(9 * unit),
            }}
          >
            {formatValue(highlightedValue)}
          </span>
        )}

      {average != null && (
        <span
          className={cn(
            'pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-caption font-semibold text-foreground',
            !averageOnLeft && '-translate-x-full',
          )}
          style={{
            left: averageOnLeft
              ? plot.margin.left
              : plot.margin.left + plot.plotWidth,
            top: plot.y(average.value) - Math.round(10 * unit),
          }}
        >
          {average.label}
        </span>
      )}

      {active != null && (
        <UIChartTooltip
          title={labels[active]}
          x={slotCenter(active)}
          flip={active >= count / 2}
          rows={series.map((item, bar) => ({
            color: seriesColor(bar, item.color),
            label: item.name,
            value: formatValue(item.values[active] ?? 0),
          }))}
        />
      )}
    </div>
  );
}
export const UIBarChart = memo(UIBarChartBase);
