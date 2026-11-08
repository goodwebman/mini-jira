import type { Context } from 'hono';

/** Тело нужно до валидатора. null значит битый JSON или не объект: их разберёт валидатор. */
export async function peekJsonObject(c: Context): Promise<Record<string, unknown> | null> {
  const body: unknown = await c.req.json().catch(() => null);
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}
