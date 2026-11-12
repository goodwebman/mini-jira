import type { sentryVitePlugin } from '@sentry/bundler-plugins/vite';

type PluginOptions = NonNullable<Parameters<typeof sentryVitePlugin>[0]>;

/** Secrets stay in the build process; no source maps are generated without upload credentials. */
export function sentryBuildOptions(
  env: Record<string, string | undefined>,
  outDir: string,
): null | PluginOptions {
  const authToken = env.SENTRY_AUTH_TOKEN?.trim();
  if (!authToken) return null;
  const org = env.SENTRY_ORG?.trim();
  const project = env.SENTRY_PROJECT?.trim();
  if (!org || !project)
    throw new Error('SENTRY_AUTH_TOKEN requires SENTRY_ORG and SENTRY_PROJECT');
  return {
    authToken,
    org,
    project,
    telemetry: false,
    errorHandler: (error) => {
      throw error;
    },
    release: {
      name:
        env.SENTRY_RELEASE?.trim() ||
        env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        undefined,
    },
    sourcemaps: {
      assets: `${outDir}/**`,
      filesToDeleteAfterUpload: `${outDir}/**/*.map`,
      deleteSourcemapsAfterUpload: true,
    },
  };
}
