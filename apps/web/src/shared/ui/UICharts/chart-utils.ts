export interface ChartMargin {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface ChartPlot {
  readonly width: number;
  readonly height: number;
  readonly margin: ChartMargin;
  readonly plotWidth: number;
  readonly plotHeight: number;
  /** Y нулевой линии, px. */
  readonly baseline: number;
  readonly ticks: readonly number[];
  readonly y: (value: number) => number;
}

/** Палитра серий: цвета выдаются по порядку, не перемешиваются. */
export const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
] as const;

export function seriesColor(index: number, color: string | undefined): string {
  return color ?? CHART_PALETTE[index % CHART_PALETTE.length];
}

const round = (value: number): number => Number(value.toFixed(1));

/** Круглые деления оси Y: 1, 2, 5, 10, 20, 50… Для SP шаг всегда целый. */
export function niceScale(
  max: number,
  targetTicks = 4,
): { top: number; step: number } {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const rough = safeMax / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, Math.round(nice * magnitude));
  return { step, top: Math.ceil(safeMax / step) * step };
}

export function createPlot(
  width: number,
  height: number,
  margin: ChartMargin,
  maxValue: number,
): ChartPlot {
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  const { top, step } = niceScale(maxValue);
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) {
    ticks.push(tick);
  }

  return {
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    baseline: margin.top + plotHeight,
    ticks,
    y: (value) => round(margin.top + plotHeight * (1 - value / top)),
  };
}

/** X точки на равномерной оси; единственная точка встаёт по центру. */
export function pointX(plot: ChartPlot, index: number, count: number): number {
  const ratio = count > 1 ? index / (count - 1) : 0.5;
  return round(plot.margin.left + plot.plotWidth * ratio);
}

export function gridPath(plot: ChartPlot): string {
  return plot.ticks
    .map(
      (tick) =>
        `M${String(plot.margin.left)} ${String(plot.y(tick))}H${String(plot.margin.left + plot.plotWidth)}`,
    )
    .join('');
}

/** Линия по точкам; `null` разрывает её. */
export function linePath(
  plot: ChartPlot,
  values: readonly (number | null)[],
  count: number,
): string {
  let path = '';
  let penDown = false;
  values.forEach((value, index) => {
    if (value == null) {
      penDown = false;
      return;
    }
    path += `${penDown ? 'L' : 'M'}${String(pointX(plot, index, count))} ${String(plot.y(value))}`;
    penDown = true;
  });
  return path;
}

/** Круг внутри одного path: маркеры рисуются как обычный контур. */
export function dotPath(cx: number, cy: number, radius: number): string {
  return `M${String(cx - radius)} ${String(cy)}a${String(radius)} ${String(radius)} 0 1 0 ${String(2 * radius)} 0a${String(radius)} ${String(radius)} 0 1 0 ${String(-2 * radius)} 0`;
}

/** Через сколько подписей оси X рисовать следующую: на узких графиках реже. */
export function xLabelStep(width: number): number {
  if (width < 420) return 3;
  if (width < 640) return 2;
  return 1;
}

export function clampIndex(index: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index));
}

export function maxOf(values: readonly (number | null)[]): number {
  return values.reduce<number>(
    (max, value) => (value != null && value > max ? value : max),
    0,
  );
}

/** Последний индекс, где хотя бы у одной серии есть значение. */
export function lastDefinedIndex(
  series: readonly { values: readonly (number | null)[] }[],
): number {
  return series.reduce((last, { values }) => {
    const index = values.findLastIndex((value) => value != null);
    return Math.max(last, index);
  }, -1);
}
