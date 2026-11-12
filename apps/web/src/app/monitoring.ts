import { type Monitoring, createMonitoring } from '@gwmt/monitoring';
import * as Sentry from '@sentry/react';

import { env } from '@/shared/config';

// Keep one SDK client through HMR; app-owned subscriptions have separate disposers.
export const monitoring: Monitoring =
  import.meta.hot?.data.monitoring ??
  createMonitoring({
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
          integrations: [
            Sentry.globalHandlersIntegration(),
            Sentry.browserApiErrorsIntegration(),
            Sentry.linkedErrorsIntegration(),
            Sentry.dedupeIntegration(),
            Sentry.breadcrumbsIntegration({ dom: false, sentry: false }),
          ],
        }),
    },
    dsn: env.sentryDsn,
    enabled: env.isProd || env.sentryEnabled,
    environment: env.sentryEnvironment,
    release: env.sentryRelease,
  });

monitoring.init();
if (import.meta.hot) import.meta.hot.data.monitoring = monitoring;
