import { createMonitoring } from '@gwmt/monitoring';
import * as Sentry from '@sentry/node';

export const monitoring = createMonitoring({
  sdk: {
    isEnabled: Sentry.isEnabled,
    captureException: Sentry.captureException,
    setUser: Sentry.setUser,
    addBreadcrumb: Sentry.addBreadcrumb,
    flush: Sentry.flush,
    init: (options) =>
      Sentry.init({
        ...options,
        defaultIntegrations: false,
        enableOpenTelemetrySetup: false,
        enableRuntimeChannelInjection: false,
        integrations: [
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
          Sentry.linkedErrorsIntegration(),
        ],
      }),
  },
  dsn: process.env.SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === 'production' ||
    process.env.SENTRY_ENABLED === 'true',
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development',
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
});
