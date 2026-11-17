// @vitest-environment node
import { loadEnv } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import viteConfig from '../vite.config.ts';

vi.mock('vite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vite')>()),
  loadEnv: vi.fn(),
}));

const validEnv = {
  VITE_API_URL: '/api/v1',
  VITE_APP_VERSION: '1.0.0',
  VITE_AUTH_SALT: 'a'.repeat(64),
};

beforeEach(() => vi.mocked(loadEnv).mockReturnValue({ ...validEnv }));

describe('Vite build policies', () => {
  it('fails a misconfigured build while still allowing the dev server to start', () => {
    vi.mocked(loadEnv).mockReturnValue({});
    expect(() => viteConfig({ command: 'build', mode: 'production' })).toThrow(
      'VITE_API_URL',
    );
    expect(() =>
      viteConfig({ command: 'serve', mode: 'development' }),
    ).not.toThrow();
  });

  it('does not emit source maps without upload credentials', () => {
    const config = viteConfig({ command: 'build', mode: 'production' });
    expect(config.build?.sourcemap).toBe(false);
    expect(config.build?.minify).toBe('oxc');
  });

  it('uses hidden maps with authenticated uploads and never defines the secret for the client', () => {
    vi.mocked(loadEnv).mockReturnValue({
      ...validEnv,
      SENTRY_AUTH_TOKEN: 'build-only-secret',
      SENTRY_ORG: 'org',
      SENTRY_PROJECT: 'web',
      SENTRY_RELEASE: 'commit',
    });
    const config = viteConfig({ command: 'build', mode: 'production' });
    expect(config.build?.sourcemap).toBe('hidden');
    expect(config.envPrefix).toBe('VITE_');
    expect(JSON.stringify(config.define)).not.toContain('build-only-secret');
    expect(config.define?.['import.meta.env.VITE_SENTRY_RELEASE']).toBe(
      '"commit"',
    );
  });

  it.each([
    { command: 'serve' as const, mode: 'development' },
    { command: 'build' as const, mode: 'development' },
  ])('does not initialize uploads for $command / $mode', (configEnv) => {
    // Неполные credentials упали бы при вызове sentryBuildOptions.
    vi.mocked(loadEnv).mockReturnValue({
      ...validEnv,
      SENTRY_AUTH_TOKEN: 'token',
    });
    expect(viteConfig(configEnv).build?.sourcemap).toBe(false);
  });

  it('allows production verification to explicitly disable upload', () => {
    vi.mocked(loadEnv).mockReturnValue({
      ...validEnv,
      SENTRY_AUTH_TOKEN: 'token',
      BUILD_SENTRY_UPLOAD: 'false',
    });
    expect(
      viteConfig({ command: 'build', mode: 'production' }).build?.sourcemap,
    ).toBe(false);
  });

  it('analyzes production assets without initializing uploads', () => {
    vi.mocked(loadEnv).mockReturnValue({
      ...validEnv,
      SENTRY_AUTH_TOKEN: 'token',
      BUILD_ANALYZE: 'true',
    });
    const config = viteConfig({ command: 'build', mode: 'production' });
    expect(config.build?.sourcemap).toBe(false);
    expect(config.build?.reportCompressedSize).toBe(true);
  });
});
