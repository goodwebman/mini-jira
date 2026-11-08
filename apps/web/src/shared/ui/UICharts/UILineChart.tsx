import { memo, useState, type PointerEvent } from 'react';
import { cn } from '../../lib/cn';
import { ChartAxes } from './ChartAxes';
import {
  clampIndex,
  createPlot,
  dotPath,
  gridPath,
  lastDefinedIndex,
  linePath,
  maxOf,
  pointX,
  seriesColor,
  xLabelStep,
} from './chart-utils';
import { UIChartTooltip } from './UIChartTooltip';
import { useChartBox } from './use-chart-box';

export interface IUILineChartSeries {
  readonly name: string;
  /** Значения по точкам оси X; `null` — данных нет, линия прерывается. */
  readonly values: readonly (number | null)[];
  /** Цвет; по умолчанию следующий из палитры. */
  readonly color?: string;
  /** `solid` — факт, `dashed` — идеал, `dotted` — прогноз. */
  readonly variant?: 'solid' | 'dashed' | 'dotted';
  /** Заливка под линией. */
  readonly area?: boolean;
  /** Маркер на последней точке. */
  readonly endMarker?: boolean;
}

export interface IUILineChartProps {
  /** Описание графика для скринридера. */
  readonly ariaLabel: string;
  readonly labels: readonly string[];
  readonly series: readonly IUILineChartSeries[];
  /** Высота, px. По умолчанию своя для каждого экрана. */
  readonly height?: number;
  /** Формат значений в подсказке. */
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
}

const STROKE = {
  solid: { strokeWidth: 2, strokeDasharray: undefined, strokeLinecap: 'round' },
  dashed: { strokeWidth: 1.5, strokeDasharray: '5 4', strokeLinecap: undefined },
  dotted: { strokeWidth: 2, strokeDasharray: '2 5', strokeLinecap: 'round' },
} as const;

/**
 * Линейный график: сгорание спринта и подобные.
 *
 * @example
 * <UILineChart
 *   ariaLabel="Сгорание: осталось 22 SP из 64"
 *   labels={days}
 *   series={[
 *     { name: 'Осталось', values: remaining, area: true, endMarker: true },
 *     { name: 'Идеал', values: ideal, color: 'var(--chart-neutral)', variant: 'dashed' },
 *   ]}
 * />
 */
function UILineChartBase({
  ariaLabel,
  labels,
  series,
  height: heightProp,
  formatValue = String,
  className,
}: IUILineChartProps) {
  const { ref, width, height, unit } = useChartBox('tall', heightProp);
  const [hovered, setHovered] = useState<number | null>(null);

  const count = labels.length;
  const plot = createPlot(
    width,
    height,
    {
      left: Math.round(30 * unit),
      right: 16,
      top: Math.round(26 * unit),
      bottom: Math.round(24 * unit),
    },
    Math.max(...series.map(({ values }) => maxOf(values)), 0),
  );
  const step = xLabelStep(width);
  const lastIndex = lastDefinedIndex(series);
  const active = hovered != null && hovered <= lastIndex ? hovered : null;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - plot.margin.left) / plot.plotWidth;
    setHovered(clampIndex(Math.round(ratio * (count - 1)), count));
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      data-name="UILineChart"
      className={cn('relative w-full touch-pan-y', className)}
      style={{ height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        setHovered(null);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="absolute inset-0 block size-full overflow-visible"
      >
        <path d={gridPath(plot)} fill="none" stroke="var(--border)" strokeWidth={1} />
        {series.map((item, index) => {
          const color = seriesColor(index, item.color);
          const line = linePath(plot, item.values, count);
          const lastPoint = item.values.findLastIndex((value) => value != null);
          const firstPoint = item.values.findIndex((value) => value != null);
          const lastValue = item.values[lastPoint];

          return (
            <g key={item.name}>
              {item.area && lastPoint >= 0 && (
                <path
                  d={`${line}L${String(pointX(plot, lastPoint, count))} ${String(plot.baseline)}L${String(pointX(plot, firstPoint, count))} ${String(plot.baseline)}Z`}
                  fill={color}
                  opacity={0.1}
                />
              )}
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeLinejoin="round"
                {...STROKE[item.variant ?? 'solid']}
              />
              {item.endMarker && lastValue != null && (
                <path
                  d={dotPath(pointX(plot, lastPoint, count), plot.y(lastValue), 5)}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
        {active != null && (
          <path
            d={`M${String(pointX(plot, active, count))} ${String(plot.margin.top)}V${String(plot.baseline)}`}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={1}
          />
        )}
      </svg>

      <ChartAxes
        plot={plot}
        unit={unit}
        xLabels={labels.flatMap((text, index) =>
          index % step === 0 ? [{ x: pointX(plot, index, count), text, first: index === 0 }] : [],
        )}
      />

      {active != null && (
        <UIChartTooltip
          title={labels[active]}
          x={pointX(plot, active, count)}
          flip={active > count / 2}
          rows={series.flatMap((item, index) => {
            const value = item.values[active];
            return value == null
              ? []
              : [{ color: seriesColor(index, item.color), label: item.name, value: formatValue(value) }];
          })}
        />
      )}
    </div>
  );
}
export const UILineChart = memo(UILineChartBase);
