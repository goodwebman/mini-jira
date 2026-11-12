import type { ErrorEvent, EventHint } from '@sentry/core';

import { scrubEvent } from './privacy.js';

const EXPECTED_CODES = new Set([
  'aborted',
  'session_changed',
  'destroyed',
  'unauthorized',
  'forbidden',
  'bad_request',
  'rate_limited',
]);

export function isExpectedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const status = value.status ?? value.statusCode;
  if (typeof status === 'number' && status >= 500) return false;
  return (
    value.name === 'AbortError' ||
    value.name === 'CancelledError' ||
    value.name === 'CanceledError' ||
    (value.name === 'AuthError' &&
      typeof value.code === 'string' &&
      EXPECTED_CODES.has(value.code)) ||
    (typeof status === 'number' && status >= 400 && status < 500)
  );
}

export function beforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  try {
    hint.attachments = [];
    const unhandled = event.exception?.values?.some(
      (value) => value.mechanism?.handled === false,
    );
    if (!unhandled && isExpectedError(hint.originalException)) return null;
    return scrubEvent(event);
  } catch {
    // Fail closed: an unsanitizable payload must never be sent as a fallback.
    return null;
  }
}
