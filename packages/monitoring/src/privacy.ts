import type { Breadcrumb, ErrorEvent, StackFrame } from '@sentry/core';

const FILTERED = '[Filtered]';
const MAX_ITEMS = 100;
const SENSITIVE_KEY =
  /authorization|cookie|credential|email|password|passwd|phone|secret|token|api.?key|^ip(_?address)?$|^(body|data|params|query_string|config|request|response|details|sql)$/i;

/** Never include URL credentials, query parameters or fragments. */
export function redactUrl(value: string): string {
  return value.replace(/([?#]).*$/s, '').replace(/(\/\/)[^/@\s]+@/, '$1');
}

export function scrubText(value: string): string {
  if (value.startsWith('Failed query:')) return 'Database query failed';
  if (value.length > 8192) return FILTERED;
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, redactUrl)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, FILTERED)
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, `$1 ${FILTERED}`)
    .replace(
      /\b([\w-]*(?:token|password|secret|api[_-]?key)[\w-]*)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      `$1=${FILTERED}`,
    )
    .slice(0, 2048);
}

/** Bounded, non-mutating traversal: hostile getters, cycles and huge payloads cannot break reporting. */
export function scrubRecord(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const seen = new WeakSet<object>();
  let remaining = 1000;
  const visit = (value: unknown, key: string, depth: number): unknown => {
    if (--remaining < 0 || SENSITIVE_KEY.test(key)) return FILTERED;
    if (typeof value === 'string') {
      return /(?:url|uri|href|path|from|to)$/i.test(key)
        ? scrubText(redactUrl(value))
        : scrubText(value);
    }
    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    )
      return value;
    if (typeof value !== 'object') return undefined;
    if (depth >= 6 || seen.has(value)) return FILTERED;
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        return Array.from(
          { length: Math.min(value.length, MAX_ITEMS) },
          (_, index) => {
            const descriptor = Object.getOwnPropertyDescriptor(
              value,
              String(index),
            );
            return descriptor && 'value' in descriptor
              ? visit(descriptor.value, '', depth + 1)
              : FILTERED;
          },
        );
      }
      const entries: [string, unknown][] = [];
      let scanned = 0;
      for (const name in value) {
        if (++scanned > MAX_ITEMS) break;
        const descriptor = Object.getOwnPropertyDescriptor(value, name);
        if (descriptor)
          entries.push([
            name,
            'value' in descriptor
              ? visit(descriptor.value, name, depth + 1)
              : FILTERED,
          ]);
      }
      return Object.fromEntries(entries);
    } catch {
      return FILTERED;
    } finally {
      seen.delete(value);
    }
  };
  const result = visit(input, '', 0);
  return typeof result === 'object' && result !== null
    ? (result as Record<string, unknown>)
    : {};
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console arguments, DOM selectors and arbitrary UI messages may contain form values.
  if (
    !['fetch', 'xhr', 'navigation', 'auth'].includes(breadcrumb.category ?? '')
  )
    return null;
  const data = breadcrumb.data ?? {};
  const allowed = Object.fromEntries(
    ['url', 'from', 'to', 'method', 'status_code', 'type'].map((key) => [
      key,
      data[key],
    ]),
  );
  return {
    timestamp: breadcrumb.timestamp,
    category: breadcrumb.category,
    type: breadcrumb.type,
    level: breadcrumb.level,
    data: scrubRecord(allowed),
  };
}

function scrubFrame(frame: StackFrame): StackFrame {
  // Keep symbolication coordinates; exclude source code and captured local variables.
  return {
    filename: frame.filename ? redactUrl(frame.filename) : undefined,
    abs_path: frame.abs_path ? redactUrl(frame.abs_path) : undefined,
    function: frame.function,
    module: frame.module,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
    debug_id: frame.debug_id,
  };
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    sdk: event.sdk,
    transaction: event.transaction
      ? scrubText(redactUrl(event.transaction))
      : undefined,
    fingerprint: event.fingerprint?.map(scrubText),
    debug_meta: event.debug_meta
      ? {
          images: event.debug_meta.images
            ?.filter((image) => image.type === 'sourcemap')
            .map((image) => ({
              type: 'sourcemap' as const,
              code_file: redactUrl(image.code_file),
              debug_id: image.debug_id,
            })),
        }
      : undefined,
    message: event.message ? scrubText(event.message) : undefined,
    logentry: event.logentry
      ? { message: scrubText(event.logentry.message ?? '') }
      : undefined,
    user:
      event.user?.id === undefined ? undefined : { id: String(event.user.id) },
    request: event.request
      ? {
          method: event.request.method,
          url: event.request.url ? redactUrl(event.request.url) : undefined,
        }
      : undefined,
    extra: event.extra ? scrubRecord(event.extra) : undefined,
    contexts: event.contexts
      ? (scrubRecord(event.contexts) as ErrorEvent['contexts'])
      : undefined,
    tags: event.tags
      ? (scrubRecord(event.tags) as ErrorEvent['tags'])
      : undefined,
    breadcrumbs: event.breadcrumbs
      ?.map(scrubBreadcrumb)
      .filter((item) => item !== null),
    exception: event.exception
      ? {
          values: event.exception.values?.map((exception) => ({
            type: exception.type,
            value:
              exception.type === 'DrizzleQueryError'
                ? 'Database query failed'
                : scrubText(exception.value ?? ''),
            mechanism: exception.mechanism
              ? {
                  type: exception.mechanism.type,
                  handled: exception.mechanism.handled,
                  synthetic: exception.mechanism.synthetic,
                  exception_id: exception.mechanism.exception_id,
                  parent_id: exception.mechanism.parent_id,
                  source: exception.mechanism.source,
                }
              : undefined,
            stacktrace: exception.stacktrace
              ? {
                  frames: exception.stacktrace.frames?.map(scrubFrame),
                }
              : undefined,
          })),
        }
      : undefined,
  };
}
