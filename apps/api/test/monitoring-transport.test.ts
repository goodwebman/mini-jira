import { createMonitoring } from '@gwmt/monitoring';
import * as Sentry from '@sentry/node';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(async () => {
  await Sentry.close(1000);
});

describe('real Sentry Node SDK transport', () => {
  it('isolates concurrent capture contexts and removes database parameter values from linked errors', async () => {
    const events: Sentry.ErrorEvent[] = [];
    const monitoring = createMonitoring({
      enabled: true,
      dsn: 'https://key@sentry.example/1',
      environment: 'test',
      sdk: {
        init: (options) =>
          Sentry.init({
            ...options,
            defaultIntegrations: false,
            enableOpenTelemetrySetup: false,
            enableRuntimeChannelInjection: false,
            integrations: [Sentry.linkedErrorsIntegration()],
            transport: () => ({
              send: async (envelope) => {
                for (const [header, body] of envelope[1]) {
                  if (header.type === 'event')
                    events.push(body as Sentry.ErrorEvent);
                }
                return { statusCode: 200 };
              },
              flush: async () => true,
            }),
          }),
        isEnabled: Sentry.isEnabled,
        captureException: Sentry.captureException,
        setUser: Sentry.setUser,
        addBreadcrumb: Sentry.addBreadcrumb,
        flush: Sentry.flush,
      },
    });
    expect(monitoring.init()).toBe(true);
    await Promise.all(
      ['one', 'two'].map(async (id) => {
        await Promise.resolve();
        monitoring.captureException(
          new DrizzleQueryError(
            'insert into secrets values ($1)',
            [`private-${id}`],
            new Error('Database unavailable'),
          ),
          {
            user: { id },
            contexts: { correlation: { requestId: `request-${id}` } },
          },
        );
      }),
    );
    expect(await monitoring.flush()).toBe(true);
    expect(events).toHaveLength(2);
    expect(
      events.map((event) => [
        event.user?.id,
        event.contexts?.correlation?.requestId,
      ]),
    ).toEqual([
      ['one', 'request-one'],
      ['two', 'request-two'],
    ]);
    expect(JSON.stringify(events)).not.toContain('private-');
    expect(
      events[0]?.exception?.values?.some(
        (value) => value.value === 'Database query failed',
      ),
    ).toBe(true);
  });
});
