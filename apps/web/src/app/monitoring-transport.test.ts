import { createMonitoring } from '@gwmt/monitoring';
import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(async () => {
  Sentry.setUser(null);
  Sentry.getCurrentScope().clearAttachments();
  await Sentry.close(1000);
});

describe('real Sentry browser SDK transport', () => {
  it('sends a sanitized exception with its original stack and deduplicates the same Error', async () => {
    const envelopes: unknown[] = [];
    const events: Sentry.ErrorEvent[] = [];
    const monitoring = createMonitoring({
      enabled: true,
      dsn: 'https://key@sentry.example/1',
      environment: 'test',
      release: 'revision',
      sdk: {
        init: (options) =>
          Sentry.init({
            ...options,
            defaultIntegrations: false,
            transport: () => ({
              send: async (envelope) => {
                envelopes.push(envelope);
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
    monitoring.setUser('42');
    Sentry.getCurrentScope().addAttachment({
      filename: 'private.txt',
      data: 'attachment-secret',
    });
    const error = new Error('Failure {"password":"message-secret"}');
    monitoring.captureException(error, { extra: { token: 'extra-secret' } });
    monitoring.captureException(error);
    expect(await monitoring.flush()).toBe(true);
    expect(events).toHaveLength(1);
    expect(JSON.stringify(envelopes)).not.toMatch(
      /message-secret|extra-secret|attachment-secret/,
    );
    expect(
      events[0]?.exception?.values?.[0]?.stacktrace?.frames?.length,
    ).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      release: 'revision',
      user: { id: '42' },
    });
    Sentry.getCurrentScope().clearAttachments();
  });
});
