import { type RefCallback, useCallback, useState } from 'react';

import {
  BREAKPOINTS,
  type Breakpoint,
  useBreakpoint,
} from '@/shared/lib/hooks';

/** Ширина до первого замера: в браузере замер успевает до paint. */
const FALLBACK_WIDTH = 640;

export type ChartHeightPreset = 'regular' | 'tall';

const HEIGHTS: Record<ChartHeightPreset, Record<Breakpoint, number>> = {
  tall: {
    w320: 220,
    w375: 220,
    w438: 220,
    w640: 240,
    w960: 260,
    w1280: 280,
    w1440: 280,
    w1920: 340,
    w2k: 340,
    w4k: 340,
  },
  regular: {
    w320: 200,
    w375: 200,
    w438: 200,
    w640: 220,
    w960: 230,
    w1280: 240,
    w1440: 240,
    w1920: 300,
    w2k: 300,
    w4k: 300,
  },
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
    unit: BREAKPOINTS[breakpoint] >= BREAKPOINTS.w1920 ? 1.2 : 1,
  };
}
