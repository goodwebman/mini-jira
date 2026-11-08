import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCn } from './use-cn';

describe('useCn', () => {
  it('склеивает и схлопывает классы как cn', () => {
    const { result } = renderHook(() => useCn('h-control', false, 'h-8', 'text-body'));
    expect(result.current).toBe('h-8 text-body');
  });

  it('обновляется при смене входных классов', () => {
    const { result, rerender } = renderHook(({ active }) => useCn('px-2', active && 'px-4'), {
      initialProps: { active: false },
    });
    expect(result.current).toBe('px-2');
    rerender({ active: true });
    expect(result.current).toBe('px-4');
  });
});
