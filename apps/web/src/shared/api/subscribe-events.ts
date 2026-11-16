import { HttpError } from './client';
import { http } from './http';
import { getApiUrl } from './requireApiUrl';

/** SSE через авторизованный fetch: EventSource не поддерживает Bearer-заголовок. */
export function subscribeEvents(
  path: string,
  onData: (data: string) => void,
  onForbidden: () => void,
): () => void {
  let stopped = false;
  let controller: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 1_000;
  const active = () => !stopped && !document.hidden && navigator.onLine;

  const connect = async () => {
    if (!active() || controller) return;
    const connection = new AbortController();
    controller = connection;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const keepAlive = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => connection.abort(), 45_000);
    };
    keepAlive();
    try {
      const response = await http(getApiUrl(path), {
        headers: { Accept: 'text/event-stream' },
        cache: 'no-store',
        signal: connection.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new HttpError(response, null);
      }
      if (
        !response.headers.get('content-type')?.includes('text/event-stream') ||
        !response.body
      ) {
        await response.body?.cancel();
        throw new Error('Expected an SSE response');
      }
      await readEvents(
        response.body,
        connection.signal,
        (data) => {
          delay = 1_000;
          onData(data);
        },
        keepAlive,
      );
    } catch (error) {
      if (
        !connection.signal.aborted &&
        error instanceof HttpError &&
        [401, 403, 404].includes(error.status)
      ) {
        stopped = true;
        onForbidden();
      }
    } finally {
      clearTimeout(timeout);
      if (controller === connection) controller = undefined;
      if (active()) {
        retry = setTimeout(
          () => {
            retry = undefined;
            void connect();
          },
          delay + Math.random() * 500,
        );
        delay = Math.min(delay * 2, 30_000);
      }
    }
  };

  const suspend = () => {
    clearTimeout(retry);
    retry = undefined;
    controller?.abort();
  };
  const resume = () => {
    if (!active()) {
      suspend();
      return;
    }
    if (!retry) void connect();
  };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);
  window.addEventListener('offline', suspend);
  void connect();
  return () => {
    stopped = true;
    suspend();
    document.removeEventListener('visibilitychange', resume);
    window.removeEventListener('online', resume);
    window.removeEventListener('offline', suspend);
  };
}

async function readEvents(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onData: (data: string) => void,
  keepAlive: () => void,
): Promise<void> {
  const reader = body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  let size = 0;
  try {
    while (!signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done || signal.aborted) return;
      keepAlive();
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length + size > 1_000_000)
        throw new Error('SSE event is too large');
      let end: number;
      while ((end = buffer.search(/[\r\n]/)) !== -1) {
        if (buffer[end] === '\r' && end === buffer.length - 1) break;
        const line = buffer.slice(0, end);
        buffer = buffer.slice(
          end + (buffer.slice(end, end + 2) === '\r\n' ? 2 : 1),
        );
        if (line === '') {
          if (data.length > 0) onData(data.join('\n'));
          data = [];
          size = 0;
        } else if (line === 'data' || line.startsWith('data:')) {
          data.push(line.slice(5).replace(/^ /, ''));
          size += line.length;
        }
      }
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
