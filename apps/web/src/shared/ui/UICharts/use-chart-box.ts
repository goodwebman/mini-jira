import { type RefCallback, useCallback, useState } from 'react';

import { type Breakpoint, useBreakpoint } from '@/shared/lib/hooks';

/** Ширина до первого замера: в браузере замер успевает до paint. */
const FALLBACK_WIDTH = 640;

export type ChartHeightPreset = 'regular' | 'tall';

const HEIGHTS: Record<ChartHeightPreset, Record<Breakpoint, number>> = {
  tall: { wide: 340, desktop: 280, laptop: 260, tablet: 240, phone: 220 },
  regular: { wide: 300, desktop: 240, laptop: 230, tablet: 220, phone: 200 },
};

export interface ChartBox {
  readonly ref: RefCallback<HTMLDivElement>;
  readonly width: number;
  readonly height: number;
  /** Множитель отступов осей: на 1920 подписи крупнее. */
  readonly unit: number;
}

/** Реальный размер графика в px: штрихи и подписи не масштабируются вместе с SVG. */
export function useChartBox(
  preset: ChartHeightPreset,
  height?: number,
): ChartBox {
  const breakpoint = useBreakpoint();
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }
    const measure = () => {
      if (node.clientWidth > 0) {
        setWidth(node.clientWidth);
      }
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(node);
    return () => {
      observer?.disconnect();
    };
  }, []);

  return {
    ref,
    width,
    height: height ?? HEIGHTS[preset][breakpoint],
    unit: breakpoint === 'wide' ? 1.2 : 1,
  };
}
