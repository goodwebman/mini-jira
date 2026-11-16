import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureHttp } from './http';
import { subscribeEvents } from './subscribe-events';

let close: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_URL', '/api/v1');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  close?.();
  close = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('subscribeEvents', () => {
  it('собирает UTF-8, CRLF и многострочные data из отдельных байтов, пропускает heartbeat', async () => {
    const data = vi.fn();
    configureHttp(async (_url, init) => {
      expect(new Headers(init?.headers).get('Accept')).toBe(
        'text/event-stream',
      );
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            const bytes = new TextEncoder().encode(
              ': heartbeat\r\n\r\ndata: Привет\r\ndata: мир\r\n\r\n',
            );
            for (const byte of bytes)
              controller.enqueue(new Uint8Array([byte]));
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      );
    });
    close = subscribeEvents('/events', data, vi.fn());
    await vi.advanceTimersByTimeAsync(1);
    expect(data).toHaveBeenCalledExactlyOnceWith('Привет\nмир');
  });

  it('не переподключается при запрете доступа', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));
    const forbidden = vi.fn();
    configureHttp(transport);
    close = subscribeEvents('/events', vi.fn(), forbidden);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(forbidden).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledOnce();
  });

  it('обрывает зависший поток без heartbeat и переподключается', async () => {
    const cancel = vi.fn<() => void>();
    const transport = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(new ReadableStream<Uint8Array>({ cancel }), {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
    );
    configureHttp(transport);
    close = subscribeEvents('/events', vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(47_000);
    expect(cancel).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
