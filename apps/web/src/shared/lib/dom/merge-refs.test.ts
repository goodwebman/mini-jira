import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mergeRefs } from './merge-refs';

describe('mergeRefs', () => {
  it('пишет узел в объектный и функциональный ref, пропускает undefined', () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const node = document.createElement('div');

    mergeRefs<HTMLDivElement>(objectRef, callbackRef, undefined)(node);

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);
  });

  it('вызывает cleanup и обнуляет ref без cleanup', () => {
    const objectRef = createRef<HTMLDivElement>();
    const cleanup = vi.fn();
    const node = document.createElement('div');

    const dispose = mergeRefs<HTMLDivElement>(objectRef, () => cleanup)(node);
    expect(typeof dispose).toBe('function');

    (dispose as () => void)();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(objectRef.current).toBeNull();
  });
});
