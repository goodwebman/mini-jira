import { memo } from 'react';

export interface IUISideNavSparkVizProps {
  /** Значения по дням. Нужно минимум два. */
  readonly values: readonly number[];
}

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 40;
const SPARK_BASE = 38;
const SPARK_RANGE = 34;

/** Спарклайн на плитке KPI. */
function UISideNavSparkVizBase({ values }: IUISideNavSparkVizProps) {
  if (values.length < 2) {
    return null;
  }

  const max = Math.max(1, ...values);
  const line = values
    .map((value, index) => {
      const x = ((index / (values.length - 1)) * SPARK_WIDTH).toFixed(1);
      const y = (SPARK_BASE - (Math.max(0, value) / max) * SPARK_RANGE).toFixed(
        1,
      );
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join('');
  const area = `${line}L${String(SPARK_WIDTH)} ${String(SPARK_HEIGHT)}L0 ${String(SPARK_HEIGHT)}Z`;

  return (
    <svg
      aria-hidden='true'
      viewBox={`0 0 ${String(SPARK_WIDTH)} ${String(SPARK_HEIGHT)}`}
      preserveAspectRatio='none'
      className='block min-h-0 w-full flex-1'
    >
      <path d={area} className='fill-(--tile-soft)' />
      <path
        d={line}
        fill='none'
        strokeWidth={2.5}
        strokeLinejoin='round'
        strokeLinecap='round'
        vectorEffect='non-scaling-stroke'
        className='stroke-(--tile-viz)'
      />
    </svg>
  );
}
export const UISideNavSparkViz = memo(UISideNavSparkVizBase);
