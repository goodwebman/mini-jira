/** Сообщения между вкладками. Только факты, токены канал не пересекают. */
export type TabMessage =
  | { readonly type: 'kick'; readonly reason: string }
  | { readonly type: 'login'; readonly identity: null | string }
  | { readonly type: 'logout' };

/** Канал читает любой код этого origin, поэтому форму сообщения проверяем. */
export function parseTabMessage(raw: unknown): null | TabMessage {
  if (typeof raw !== 'object' || raw === null) return null;
  const message = raw as {
    type?: unknown;
    reason?: unknown;
    identity?: unknown;
  };
  switch (message.type) {
    case 'logout':
      return { type: 'logout' };
    case 'kick':
      return typeof message.reason === 'string'
        ? { type: 'kick', reason: message.reason }
        : null;
    case 'login':
      if (message.identity === null || typeof message.identity === 'string') {
        return { type: 'login', identity: message.identity };
      }
      return null;
    default:
      return null;
  }
}
