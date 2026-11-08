import { memo, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { seriesColor } from './chart-utils';

export interface IUIDonutSegment {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export interface IUIDonutChartProps {
  readonly ariaLabel: string;
  readonly segments: readonly IUIDonutSegment[];
  /** Крупный текст в центре, например «42%». */
  readonly value?: ReactNode;
  /** Подпись под ним. */
  readonly caption?: ReactNode;
  readonly className?: string;
}

const RADIUS = 70;
const CENTER = 90;
const STROKE_WIDTH = 20;
const GAP_DEGREES = 2.5;
const MIN_SWEEP = 0.5;

function pointAt(degrees: number): string {
  const radians = (degrees * Math.PI) / 180;
  return `${(CENTER + RADIUS * Math.cos(radians)).toFixed(2)} ${(CENTER + RADIUS * Math.sin(radians)).toFixed(2)}`;
}

function buildArcs(segments: readonly IUIDonutSegment[]) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const gap = visible.length > 1 ? GAP_DEGREES : 0;

  let angle = -90;
  return visible.map((segment) => {
    const fullSweep = Math.min(359.9, (segment.value / total) * 360);
    const start = angle + gap / 2;
    const end = Math.max(start + MIN_SWEEP, angle + fullSweep - gap / 2);
    angle += (segment.value / total) * 360;
    const largeArc = end - start > 180 ? 1 : 0;
    return {
      key: segment.label,
      color: seriesColor(segments.indexOf(segment), segment.color),
      path: `M${pointAt(start)}A${String(RADIUS)} ${String(RADIUS)} 0 ${String(largeArc)} 1 ${pointAt(end)}`,
    };
  });
}

/**
 * Кольцевой график. Пустые и отрицательные сегменты не рисуются, при нуле виден только трек.
 *
 * @example
 * <UIDonutChart ariaLabel="Закрыто 42%" value="42%" caption="закрыто" segments={byStatus} />
 */
function UIDonutChartBase({ ariaLabel, segments, value, caption, className }: IUIDonutChartProps) {
  const arcs = buildArcs(segments);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-name="UIDonutChart"
      className={cn('relative size-donut flex-none', className)}
    >
      <svg aria-hidden="true" viewBox="0 0 180 180" className="absolute inset-0 block size-full">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE_WIDTH}
        />
        {arcs.map((arc) => (
          <path key={arc.key} d={arc.path} fill="none" stroke={arc.color} strokeWidth={STROKE_WIDTH} />
        ))}
      </svg>
      {(value != null || caption != null) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value != null && (
            <span className="text-metric font-semibold tracking-display tabular-nums">{value}</span>
          )}
          {caption != null && <span className="text-caption text-muted-foreground">{caption}</span>}
        </div>
      )}
    </div>
  );
}
export const UIDonutChart = memo(UIDonutChartBase);
