import { memo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface IUIChartTooltipRow {
  readonly color: string;
  readonly label: ReactNode;
  readonly value: ReactNode;
}

export interface IUIChartTooltipProps {
  readonly title: ReactNode;
  readonly rows: readonly IUIChartTooltipRow[];
  /** Координата X точки: с ней подсказка позиционируется над графиком. */
  readonly x?: number;
  /** Показать слева от точки, чтобы не вылезать за край. */
  readonly flip?: boolean;
  readonly className?: string;
}

/** Подсказка графика при наведении. */
function UIChartTooltipBase({ title, rows, x, flip = false, className }: IUIChartTooltipProps) {
  const position: CSSProperties | undefined =
    x == null
      ? undefined
      : { left: x, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' };

  return (
    <div
      data-name="UIChartTooltip"
      style={position}
      className={cn(
        'flex w-max flex-col gap-1 rounded-control border border-border bg-surface px-3 py-2 text-small shadow-popover',
        x != null && 'pointer-events-none absolute top-2 z-2 whitespace-nowrap',
        className,
      )}
    >
      <strong className="font-semibold">{title}</strong>
      {rows.map((row, index) => (
        <span key={index} className="flex items-center gap-[6px]">
          <span
            aria-hidden="true"
            className="size-[8px] rounded-full"
            style={{ backgroundColor: row.color }}
          />
          {row.label}: <strong className="font-semibold">{row.value}</strong>
        </span>
      ))}
    </div>
  );
}
export const UIChartTooltip = memo(UIChartTooltipBase);
