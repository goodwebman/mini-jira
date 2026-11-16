import type { BoardTaskEvent } from '@gwmt/contracts';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

import type { AppEnv } from '../../lib/context.js';
import type { TaskEventSource } from './events.js';

export function streamBoardTasks(
  c: Context<AppEnv>,
  source: TaskEventSource,
  lifetime: number,
) {
  c.header('X-Accel-Buffering', 'no');
  return streamSSE(
    c,
    async (stream) => {
      let closed = false;
      let finish = () => {};
      const done = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const close = () => {
        closed = true;
        finish();
      };
      stream.onAbort(close);
      c.req.raw.signal.addEventListener('abort', close, { once: true });
      const timeout = setTimeout(close, lifetime);
      const heartbeat = setInterval(() => {
        void stream.write(': heartbeat\n\n').catch(close);
      }, 15_000);
      let unsubscribe: (() => void) | undefined;
      let pending = 0;
      const send = (event: BoardTaskEvent) => {
        if (closed) return;
        if (++pending > 32) {
          close();
          return;
        }
        void stream
          .writeSSE({ data: JSON.stringify(event) })
          .catch(close)
          .finally(() => {
            pending -= 1;
          });
      };
      try {
        unsubscribe = await source.subscribe({
          boardId: c.get('boardId'),
          userId: c.get('userId'),
          send,
          close,
        });
        // Клиент сверяет снимок после установки LISTEN, закрывая окно пропущенных событий.
        send({ type: 'ready' });
        if (c.req.raw.signal.aborted) close();
        await done;
      } catch {
        close();
      } finally {
        closed = true;
        clearTimeout(timeout);
        clearInterval(heartbeat);
        c.req.raw.signal.removeEventListener('abort', close);
        unsubscribe?.();
      }
    },
    async () => {
      /* Обрыв закрывает поток; клиент переподключится и сверит доску. */
    },
  );
}
