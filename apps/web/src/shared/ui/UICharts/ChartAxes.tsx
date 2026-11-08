import type { ChartPlot } from './chart-utils';

interface ChartAxesProps {
  readonly plot: ChartPlot;
  /** Подписи оси X с готовыми координатами. */
  readonly xLabels: readonly { readonly x: number; readonly text: string; readonly first: boolean; readonly strong?: boolean }[];
  readonly unit: number;
}

/** Подписи осей поверх SVG: обычным текстом, чтобы не масштабировались и брали шрифт кита. */
export function ChartAxes({ plot, xLabels, unit }: ChartAxesProps) {
  return (
    <>
      {plot.ticks.map((tick) => (
        <span
          key={tick}
          className="pointer-events-none absolute left-0 -translate-y-1/2 whitespace-nowrap text-caption text-muted-foreground"
          style={{ top: plot.y(tick) }}
        >
          {tick}
        </span>
      ))}
      {xLabels.map((label) => (
        <span
          key={label.x}
          className={
            label.strong
              ? 'pointer-events-none absolute whitespace-nowrap text-caption font-semibold text-foreground'
              : 'pointer-events-none absolute whitespace-nowrap text-caption text-muted-foreground'
          }
          style={{
            left: label.x,
            top: plot.height - Math.round(8 * unit),
            transform: `translate(${label.first ? '0' : '-50%'}, -50%)`,
          }}
        >
          {label.text}
        </span>
      ))}
    </>
  );
}
