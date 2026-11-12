import { memo } from 'react';

const MAX_PIPS = 6;

export interface IUISideNavBoardVizProps {
  /** Количество задач в каждой колонке доски. */
  readonly columns: readonly number[];
}

/** Мини-доска на плитке: колонки с плашками задач. */
function UISideNavBoardVizBase({ columns }: IUISideNavBoardVizProps) {
  return (
    <div
      aria-hidden='true'
      className='flex min-h-0 flex-1 gap-1 overflow-hidden'
    >
      {columns.map((count, column) => (
        <div
          key={column}
          className='flex min-w-0 flex-1 flex-col flex-wrap content-start gap-[3px] overflow-hidden rounded-tag bg-(--tile-soft) p-[3px]'
        >
          {Array.from(
            { length: Math.min(MAX_PIPS, Math.max(0, count)) },
            (_, pip) => (
              <div
                key={pip}
                className='h-[9px] w-full flex-none rounded-[3px] bg-(--tile-viz)'
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
export const UISideNavBoardViz = memo(UISideNavBoardVizBase);

export interface IUISideNavTasksVizProps {
  /** Ближайшие задачи: показываются первые три. */
  readonly items: readonly string[];
}

/** Список ближайших задач на плитке. */
function UISideNavTasksVizBase({ items }: IUISideNavTasksVizProps) {
  return (
    // flex-wrap + w-full: строка, которой не хватило высоты, уходит в скрытую колонку целиком
    <div
      aria-hidden='true'
      className='flex min-h-0 flex-1 flex-col flex-wrap content-start justify-end gap-1 overflow-hidden'
    >
      {items.slice(0, 3).map((item, index) => (
        <div
          key={index}
          className='flex w-full flex-none items-center gap-2 text-small'
        >
          <span className='size-[12px] flex-none rounded-full border-2 border-(--tile-viz)' />
          <span className='min-w-0 truncate'>{item}</span>
        </div>
      ))}
    </div>
  );
}
export const UISideNavTasksViz = memo(UISideNavTasksVizBase);

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
