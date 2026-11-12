import { type PointerEvent, memo, useState } from 'react';

import { cn } from '@/shared/lib/cn';

import { ChartAxes } from './ChartAxes';
import { UIChartTooltip } from './UIChartTooltip';
import {
  clampIndex,
  createPlot,
  gridPath,
  lastDefinedIndex,
  pointX,
  seriesColor,
  xLabelStep,
} from './chart-utils';
import { useChartBox } from './use-chart-box';

export interface IUIAreaChartSeries {
  readonly name: string;
  /** Значения по точкам; `null` — данных пока нет (будущие дни спринта). */
  readonly values: readonly (null | number)[];
  readonly color?: string;
}

export interface IUIAreaChartProps {
  readonly ariaLabel: string;
  readonly labels: readonly string[];
  /** Слои снизу вверх. */
  readonly series: readonly IUIAreaChartSeries[];
  readonly height?: number;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

/**
 * Накопительный график со слоями.
 *
 * @example
 * <UIAreaChart ariaLabel="Накопительный поток" labels={days} series={flow} />
 */
function UIAreaChartBase({
  ariaLabel,
  labels,
  series,
  height: heightProp,
  formatValue = String,
  className,
}: IUIAreaChartProps) {
  const { ref, width, height, unit } = useChartBox('regular', heightProp);
  const [hovered, setHovered] = useState<null | number>(null);

  const count = labels.length;
  const lastIndex = lastDefinedIndex(series);

  const totals = labels.map((_, index) =>
    series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0),
  );
  const plot = createPlot(
    width,
    height,
    {
      left: Math.round(30 * unit),
      right: 8,
      top: 10,
      bottom: Math.round(24 * unit),
    },
    Math.max(0, ...totals),
  );

  // Накапливаем снизу вверх: верх предыдущего слоя — низ следующего
  const running = labels.map(() => 0);
  const layers = series.map((item, seriesIndex) => {
    const lower = running.slice();
    let path = '';
    for (let index = 0; index <= lastIndex; index += 1) {
      running[index] += item.values[index] ?? 0;
      path += `${index === 0 ? 'M' : 'L'}${String(pointX(plot, index, count))} ${String(plot.y(running[index]))}`;
    }
    for (let index = lastIndex; index >= 0; index -= 1) {
      path += `L${String(pointX(plot, index, count))} ${String(plot.y(lower[index]))}`;
    }
    return {
      key: item.name,
      path: `${path}Z`,
      color: seriesColor(seriesIndex, item.color),
    };
  });

  const step = xLabelStep(width);
  const active = hovered != null && hovered <= lastIndex ? hovered : null;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio =
      (event.clientX - rect.left - plot.margin.left) / plot.plotWidth;
    setHovered(clampIndex(Math.round(ratio * (count - 1)), count));
  };

  return (
    <div
      ref={ref}
      role='img'
      aria-label={ariaLabel}
      data-name='UIAreaChart'
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
        {lastIndex >= 0 &&
          layers.map((layer) => (
            <path
              key={layer.key}
              d={layer.path}
              fill={layer.color}
              stroke='var(--surface)'
              strokeWidth={1.5}
              strokeLinejoin='round'
            />
          ))}
        {active != null && (
          <path
            d={`M${String(pointX(plot, active, count))} ${String(plot.margin.top)}V${String(plot.baseline)}`}
            fill='none'
            stroke='var(--foreground)'
            strokeWidth={1}
          />
        )}
      </svg>

      <ChartAxes
        plot={plot}
        unit={unit}
        xLabels={labels.flatMap((text, index) =>
          index % step === 0
            ? [{ x: pointX(plot, index, count), text, first: index === 0 }]
            : [],
        )}
      />

      {active != null && (
        <UIChartTooltip
          title={labels[active]}
          x={pointX(plot, active, count)}
          flip={active > count / 2}
          rows={series
            .map((item, index) => ({
              id: item.name,
              color: seriesColor(index, item.color),
              label: item.name,
              value: formatValue(item.values[active] ?? 0),
            }))
            .reverse()}
        />
      )}
    </div>
  );
}
export const UIAreaChart = memo(UIAreaChartBase);
