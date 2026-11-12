import { describe, expect, it } from 'vitest';

import { type AnchorRect, computePosition } from './position';

const viewport = { width: 1000, height: 800 };
const floating = { width: 200, height: 100 };

const anchorAt = (
  left: number,
  top: number,
  width = 100,
  height = 40,
): AnchorRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('computePosition', () => {
  it('ставит элемент на запрошенную сторону, если он влезает', () => {
    const result = computePosition(
      anchorAt(300, 300),
      floating,
      'bottom-start',
      { viewport },
    );
    expect(result).toEqual({ top: 348, left: 300, placement: 'bottom-start' });
  });

  it('выравнивает по центру и по концу', () => {
    expect(
      computePosition(anchorAt(300, 300), floating, 'top', { viewport }).left,
    ).toBe(250);
    expect(
      computePosition(anchorAt(300, 300), floating, 'bottom-end', { viewport })
        .left,
    ).toBe(200);
  });

  it('переворачивает на противоположную сторону, когда не влезает', () => {
    const result = computePosition(
      anchorAt(300, 740),
      floating,
      'bottom-start',
      { viewport },
    );
    expect(result.placement).toBe('top-start');
    expect(result.top).toBe(632);
  });

  it('не переворачивает из-за переполнения по поперечной оси, а сдвигает', () => {
    const result = computePosition(
      anchorAt(920, 300),
      floating,
      'bottom-start',
      { viewport },
    );
    expect(result.placement).toBe('bottom-start');
    expect(result.left).toBe(792);
  });

  it('если не влезает с обеих сторон — выбирает сторону с меньшим переполнением', () => {
    const tall = { width: 200, height: 500 };
    const result = computePosition(anchorAt(300, 500), tall, 'bottom-start', {
      viewport,
    });
    expect(result.placement).toBe('top-start');
    expect(result.top).toBeGreaterThanOrEqual(8);
  });

  it('элемент больше экрана прижимается к началу', () => {
    const huge = { width: 1200, height: 900 };
    const result = computePosition(anchorAt(300, 300), huge, 'bottom-start', {
      viewport,
    });
    expect(result.top).toBe(8);
    expect(result.left).toBe(8);
  });

  it('работает для боковых сторон', () => {
    const right = computePosition(anchorAt(300, 300), floating, 'right-start', {
      viewport,
    });
    expect(right).toEqual({ top: 300, left: 408, placement: 'right-start' });
    const flipped = computePosition(anchorAt(850, 300), floating, 'right', {
      viewport,
    });
    expect(flipped.placement).toBe('left');
  });
});
