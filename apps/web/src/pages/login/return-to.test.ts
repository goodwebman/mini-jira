// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it.each([
    null,
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
    '/login?returnTo=/login',
    '/api/v1/auth/logout',
    '/x/../login',
  ])('rejects unsafe destination %s', (value) => {
    expect(safeReturnTo(value)).toBe('/boards');
  });
  it('preserves a local route including query and fragment', () => {
    expect(safeReturnTo('/boards/1?q=test#task')).toBe('/boards/1?q=test#task');
  });
});
