/** Размещение floating-элемента относительно якоря. */
export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'center' | 'start' | 'end';

export interface AnchorRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

export interface FloatingSize {
  readonly width: number;
  readonly height: number;
}

export interface PositionOptions {
  /** Отступ от якоря, px. */
  readonly gutter?: number;
  /** Отступ от краёв viewport, px. */
  readonly viewportPadding?: number;
  /** Размер viewport; по умолчанию — окно браузера. */
  readonly viewport?: FloatingSize;
}

export interface PositionResult {
  readonly top: number;
  readonly left: number;
  readonly placement: Placement;
}

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split('-') as [Side, Align | undefined];
  return { side, align: align ?? 'center' };
}

function toPlacement(side: Side, align: Align): Placement {
  return (align === 'center' ? side : `${side}-${align}`) as Placement;
}

function alignOnAxis(
  start: number,
  length: number,
  size: number,
  align: Align,
): number {
  if (align === 'start') return start;
  if (align === 'end') return start + length - size;
  return start + length / 2 - size / 2;
}

function place(
  anchor: AnchorRect,
  floating: FloatingSize,
  side: Side,
  align: Align,
  gutter: number,
): PositionResult {
  const placement = toPlacement(side, align);

  if (side === 'top' || side === 'bottom') {
    return {
      top:
        side === 'top'
          ? anchor.top - floating.height - gutter
          : anchor.bottom + gutter,
      left: alignOnAxis(anchor.left, anchor.width, floating.width, align),
      placement,
    };
  }

  return {
    top: alignOnAxis(anchor.top, anchor.height, floating.height, align),
    left:
      side === 'left'
        ? anchor.left - floating.width - gutter
        : anchor.right + gutter,
    placement,
  };
}

/** На сколько px элемент вылезает за viewport вдоль оси размещения (0 — не вылезает). */
function mainAxisOverflow(
  position: PositionResult,
  floating: FloatingSize,
  side: Side,
  viewport: FloatingSize,
  padding: number,
): number {
  if (side === 'top' || side === 'bottom') {
    return (
      Math.max(0, padding - position.top) +
      Math.max(0, position.top + floating.height - (viewport.height - padding))
    );
  }
  return (
    Math.max(0, padding - position.left) +
    Math.max(0, position.left + floating.width - (viewport.width - padding))
  );
}

function clamp(value: number, min: number, max: number): number {
  // Элемент больше доступной области — прижимаем к началу, чтобы начало было видно
  return max < min ? min : Math.min(Math.max(value, min), max);
}

function getViewport(): FloatingSize {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Считает позицию floating-элемента относительно якоря с учётом viewport:
 * 1. Берёт запрошенную сторону; если не влезает — противоположную.
 * 2. Если не влезает ни там, ни там — ту, где переполнение меньше.
 * 3. Вдвигает результат в viewport по обеим осям.
 *
 * Чистая функция — тестируется без DOM.
 */
export function computePosition(
  anchor: AnchorRect,
  floating: FloatingSize,
  placement: Placement = 'bottom-start',
  options: PositionOptions = {},
): PositionResult {
  const { gutter = 8, viewportPadding = 8, viewport = getViewport() } = options;
  const { side, align } = parsePlacement(placement);
  const oppositeSide = OPPOSITE_SIDE[side];

  const preferred = place(anchor, floating, side, align, gutter);
  const preferredOverflow = mainAxisOverflow(
    preferred,
    floating,
    side,
    viewport,
    viewportPadding,
  );

  const flipped = place(anchor, floating, oppositeSide, align, gutter);
  const flippedOverflow = mainAxisOverflow(
    flipped,
    floating,
    oppositeSide,
    viewport,
    viewportPadding,
  );

  const best = flippedOverflow < preferredOverflow ? flipped : preferred;

  return {
    placement: best.placement,
    top: clamp(
      best.top,
      viewportPadding,
      viewport.height - floating.height - viewportPadding,
    ),
    left: clamp(
      best.left,
      viewportPadding,
      viewport.width - floating.width - viewportPadding,
    ),
  };
}
