import type { Breadcrumb, ClientOptions, ScopeContext } from '@sentry/core';

import { beforeSend, isExpectedError } from './policy.js';
import { scrubBreadcrumb } from './privacy.js';

export type MonitoringOptions = Pick<
  ClientOptions,
  | 'beforeBreadcrumb'
  | 'beforeSend'
  | 'beforeSendLog'
  | 'beforeSendMetric'
  | 'dataCollection'
  | 'dsn'
  | 'environment'
  | 'maxBreadcrumbs'
  | 'release'
  | 'sampleRate'
  | 'tracePropagationTargets'
>;

export type MonitoringContext = Partial<
  Pick<ScopeContext, 'contexts' | 'extra' | 'tags' | 'user'>
>;

/** Structural SDK port: no runtime dependency on React, Node, auth, Vite or app configuration. */
export interface MonitoringSdk {
  init(options: MonitoringOptions): unknown;
  isEnabled(): boolean;
  captureException(error: unknown, context?: MonitoringContext): string;
  setUser(user: null | { id: string }): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  flush(timeout: number): Promise<boolean>;
}

export interface MonitoringConfig {
  readonly sdk: MonitoringSdk;
  readonly dsn?: string;
  readonly enabled: boolean;
  readonly environment: string;
  readonly release?: string;
}

export function createMonitoring(config: MonitoringConfig) {
  const { sdk } = config;
  let initialized = false;
  const safe = <T>(action: () => T, fallback: T): T => {
    try {
      return action();
    } catch {
      return fallback;
    }
  };
  const isEnabled = () => initialized && safe(() => sdk.isEnabled(), false);

  return {
    init(): boolean {
      if (initialized) return isEnabled();
      if (!config.enabled || !config.dsn?.trim()) return false;
      return safe(() => {
        sdk.init({
          dsn: config.dsn?.trim(),
          environment: config.environment,
          release: config.release?.trim() || undefined,
          sampleRate: 1,
          maxBreadcrumbs: 30,
          beforeSendLog: () => null,
          beforeSendMetric: () => null,
          tracePropagationTargets: [],
          dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            queues: false,
            stackFrameVariables: false,
            frameContextLines: 0,
            graphQL: { document: false, variables: false },
            genAI: { inputs: false, outputs: false },
            mcp: { inputs: false, outputs: false },
          },
          beforeSend,
          beforeBreadcrumb: scrubBreadcrumb,
        });
        initialized = true;
        return isEnabled();
      }, false);
    },
    isEnabled,
    captureException(
      error: unknown,
      context?: MonitoringContext,
    ): string | undefined {
      if (!isEnabled()) return;
      return safe(() => {
        if (isExpectedError(error)) return;
        // SDK receives the original Error, preserving its stack and built-in deduplication.
        const normalized =
          error instanceof Error
            ? error
            : new Error(
                typeof error === 'string' ? error : 'Non-Error exception',
              );
        return sdk.captureException(normalized, context);
      }, undefined);
    },
    setUser(id: null | string): void {
      if (isEnabled()) safe(() => sdk.setUser(id ? { id } : null), undefined);
    },
    addBreadcrumb(type: string): void {
      if (isEnabled())
        safe(
          () => sdk.addBreadcrumb({ category: 'auth', data: { type } }),
          undefined,
        );
    },
    async flush(timeout = 2000): Promise<boolean> {
      if (!isEnabled()) return false;
      try {
        return await sdk.flush(timeout);
      } catch {
        return false;
      }
    },
  };
}

export type Monitoring = ReturnType<typeof createMonitoring>;
