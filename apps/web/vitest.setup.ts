/// <reference types="@testing-library/jest-dom/vitest" />
import * as domMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Матчеры регистрируются на `expect` этого же модуля. Готовый вход
// `@testing-library/jest-dom/vitest` импортирует свой `vitest`: на Windows путь
// с другим регистром диска (`c:` и `C:`) давал второй экземпляр, и матчеры
// пропадали в части прогонов.
expect.extend(domMatchers);

afterEach(cleanup);

// jsdom не реализует ResizeObserver — нужен floating-элементам и графикам.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom не реализует matchMedia — нужен useMediaQuery и производным хукам.
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
