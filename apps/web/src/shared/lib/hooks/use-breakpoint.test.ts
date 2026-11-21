import { act, renderHook } from '@testing-library/react';
import { compile } from 'tailwindcss';
import { afterEach, expect, it, vi } from 'vitest';

import theme from '@/shared/styles/theme.css?raw';

import { BREAKPOINTS, useBreakpoint } from './use-breakpoint';

afterEach(() => vi.unstubAllGlobals());

it('возвращает имя порога при изменении ширины окна', () => {
  vi.stubGlobal('innerWidth', 319);
  const { result } = renderHook(useBreakpoint);
  expect(result.current).toBe('w320');

  for (const [name, width] of Object.entries(BREAKPOINTS)) {
    act(() => {
      vi.stubGlobal('innerWidth', width);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(name);
  }

  act(() => {
    vi.stubGlobal('innerWidth', 639);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe('w438');
});

it('синхронизирует ширины с темой и собирает обе границы для каждого имени', async () => {
  const entries = Object.entries(BREAKPOINTS);
  const cssBreakpoints = [
    ...theme.matchAll(/--breakpoint-(\w+): (\d+)px;/g),
  ].map(([, name, width]) => [name, Number(width)]);
  expect(cssBreakpoints).toEqual(entries);

  const { build } = await compile(`@tailwind utilities;\n${theme}`);
  const css = build(
    entries.flatMap(([name]) => [`${name}:block`, `max-${name}:hidden`]),
  );
  for (const [name, width] of entries) {
    expect(css).toContain(`.${name}\\:block`);
    expect(css).toContain(`.max-${name}\\:hidden`);
    expect(css).toContain(`@media (width >= ${String(width)}px)`);
    expect(css).toContain(`@media (width < ${String(width)}px)`);
  }
});
