// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { sentryBuildOptions } from '../sentry-build.ts';

describe('source map upload policy', () => {
  it('fails the build when source map upload fails', () => {
    const options = sentryBuildOptions(
      { SENTRY_AUTH_TOKEN: 'secret', SENTRY_ORG: 'org', SENTRY_PROJECT: 'web' },
      '/dist',
    );
    expect(() => options?.errorHandler?.(new Error('upload failed'))).toThrow(
      'upload failed',
    );
  });
  it('does not generate/upload source maps without credentials', () => {
    expect(sentryBuildOptions({}, '/dist')).toBeNull();
    expect(
      sentryBuildOptions({ SENTRY_ORG: 'org', SENTRY_PROJECT: 'web' }, '/dist'),
    ).toBeNull();
  });
  it('fails a misconfigured authenticated build instead of silently publishing maps', () => {
    expect(() =>
      sentryBuildOptions({ SENTRY_AUTH_TOKEN: 'secret' }, '/dist'),
    ).toThrow('SENTRY_ORG');
  });
  it('uploads only build assets, deletes map files and matches the runtime release', () => {
    expect(
      sentryBuildOptions(
        {
          SENTRY_AUTH_TOKEN: ' secret ',
          SENTRY_ORG: 'org',
          SENTRY_PROJECT: 'web',
          SENTRY_RELEASE: 'revision',
          VERCEL_GIT_COMMIT_SHA: 'other',
        },
        'C:/app/dist',
      ),
    ).toMatchObject({
      authToken: 'secret',
      org: 'org',
      project: 'web',
      telemetry: false,
      release: { name: 'revision' },
      sourcemaps: {
        assets: 'C:/app/dist/**',
        filesToDeleteAfterUpload: 'C:/app/dist/**/*.map',
        deleteSourcemapsAfterUpload: true,
      },
    });
    expect(
      sentryBuildOptions(
        {
          SENTRY_AUTH_TOKEN: 'secret',
          SENTRY_ORG: 'org',
          SENTRY_PROJECT: 'web',
          VERCEL_GIT_COMMIT_SHA: 'commit',
        },
        '/dist',
      )?.release?.name,
    ).toBe('commit');
  });
});
