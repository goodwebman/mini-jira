import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

/** Вид метки: `line`, `dashed`, `dotted` — для линий, остальные — для заливок. */
export type UIChartLegendMarkerKind =
  'dashed' | 'dot' | 'dotted' | 'line' | 'square';

const LINE_STYLE: Record<'dashed' | 'dotted' | 'line', string> = {
  line: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

/** Цветная метка серии в легенде. */
export function UIChartLegendMarker({
  marker,
  color,
}: {
  readonly marker: UIChartLegendMarkerKind;
  readonly color: string;
}) {
  if (marker === 'dot' || marker === 'square') {
    return (
      <span
        aria-hidden='true'
        className={cn(
          'size-[10px] flex-none',
          marker === 'dot' ? 'rounded-full' : 'rounded-[3px]',
        )}
        style={{ backgroundColor: color }}
      />
    );
  }

  const style: CSSProperties = {
    borderTop: `2px ${LINE_STYLE[marker]} ${color}`,
  };
  return (
    <span aria-hidden='true' className='h-0 w-[16px] flex-none' style={style} />
  );
}
