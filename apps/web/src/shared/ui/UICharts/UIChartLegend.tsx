import { memo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface IUIChartLegendItem {
  readonly label: ReactNode;
  readonly color: string;
  /** Вид метки: `line`, `dashed`, `dotted` — для линий, остальные — для заливок. */
  readonly marker?: 'dot' | 'square' | 'line' | 'dashed' | 'dotted';
  /** Значение справа. Показывается в режиме `list`. */
  readonly value?: ReactNode;
}

export interface IUIChartLegendProps {
  readonly items: readonly IUIChartLegendItem[];
  /** `inline` — строка над графиком, `list` — столбик со значениями рядом с кольцом. */
  readonly variant?: 'inline' | 'list';
  readonly className?: string;
}

const LINE_STYLE: Record<'line' | 'dashed' | 'dotted', string> = {
  line: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

function LegendMarker({
  marker,
  color,
}: {
  readonly marker: NonNullable<IUIChartLegendItem['marker']>;
  readonly color: string;
}) {
  if (marker === 'dot' || marker === 'square') {
    return (
      <span
        aria-hidden="true"
        className={cn('size-[10px] flex-none', marker === 'dot' ? 'rounded-full' : 'rounded-[3px]')}
        style={{ backgroundColor: color }}
      />
    );
  }

  const style: CSSProperties = { borderTop: `2px ${LINE_STYLE[marker]} ${color}` };
  return <span aria-hidden="true" className="h-0 w-[16px] flex-none" style={style} />;
}

/** Легенда графика: нужна при двух и более сериях. */
function UIChartLegendBase({ items, variant = 'inline', className }: IUIChartLegendProps) {
  if (variant === 'list') {
    return (
      <div data-name="UIChartLegend" className={cn('flex min-w-0 flex-col gap-1', className)}>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-small">
            <LegendMarker marker={item.marker ?? 'square'} color={item.color} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.value != null && (
              <strong className="font-semibold tabular-nums">{item.value}</strong>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-name="UIChartLegend"
      className={cn('flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground', className)}
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-[6px]">
          <LegendMarker marker={item.marker ?? 'square'} color={item.color} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
export const UIChartLegend = memo(UIChartLegendBase);
