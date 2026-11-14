import { type ReactNode, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import {
  UIChartLegendMarker,
  type UIChartLegendMarkerKind,
} from './UIChartLegendMarker';

export interface IUIChartLegendItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly color: string;
  readonly marker?: UIChartLegendMarkerKind;
  /** Значение справа. Показывается в режиме `list`. */
  readonly value?: ReactNode;
}

export interface IUIChartLegendProps {
  readonly items: readonly IUIChartLegendItem[];
  /** `inline` — строка над графиком, `list` — столбик со значениями рядом с кольцом. */
  readonly variant?: 'inline' | 'list';
  readonly className?: string;
}

/** Легенда графика: нужна при двух и более сериях. */
function UIChartLegendBase({
  items,
  variant = 'inline',
  className,
}: IUIChartLegendProps) {
  if (variant === 'list') {
    return (
      <div
        data-name='UIChartLegend'
        className={cn('flex min-w-0 flex-col gap-1', className)}
      >
        {items.map((item) => (
          <div key={item.id} className='flex items-center gap-2 text-small'>
            <UIChartLegendMarker
              marker={item.marker ?? 'square'}
              color={item.color}
            />
            <span className='min-w-0 flex-1 truncate'>{item.label}</span>
            {item.value != null && (
              <strong className='font-semibold tabular-nums'>
                {item.value}
              </strong>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-name='UIChartLegend'
      className={cn(
        'flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground',
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.id} className='flex items-center gap-[6px]'>
          <UIChartLegendMarker
            marker={item.marker ?? 'square'}
            color={item.color}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
export const UIChartLegend = memo(UIChartLegendBase);
