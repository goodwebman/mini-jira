function decodePayload(token: string): null | { exp?: unknown; iat?: unknown } {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      (char) => char.charCodeAt(0),
    );
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Срок жизни JWT как разница `exp - iat`. Абсолютный `exp` сравнивать с часами клиента
 * нельзя: они могут расходиться с сервером на часы, а длительность от этого не зависит.
 * Подпись не проверяется, поэтому значение годится только для планирования refresh.
 */
export function readJwtTtlMs(token: string): null | number {
  const payload = decodePayload(token);
  if (typeof payload?.exp !== 'number' || typeof payload.iat !== 'number')
    return null;
  return (payload.exp - payload.iat) * 1000;
}
