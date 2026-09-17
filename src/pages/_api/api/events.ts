import { subscribe } from '../../../lib/guestbook';

// GET /api/events — Server-Sent Events, the owned wire for server-to-browser
// push. A raw Request → Response handler: Waku serves anything under
// `src/pages/_api/` at the path that follows (folder `_api`, not `api`).
//
// The `: beat` comment every 25s keeps proxies from hanging up on a quiet
// stream; nginx serves this path unbuffered because the app's `apps.yml` entry
// lists it in `sse_paths`. When the visitor leaves, the request aborts and
// everything the stream started is torn down.
export const GET = (request: Request): Response => {
  const enc = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const beat = setInterval(() => ctrl.enqueue(enc.encode(': beat\n\n')), 25_000);
      const unsubscribe = subscribe((entry) => send('signed', entry));
      stop = () => {
        clearInterval(beat);
        unsubscribe();
      };
      request.signal.addEventListener('abort', () => {
        stop();
        ctrl.close();
      }, { once: true });
      send('hello', { at: new Date().toISOString() });
    },
    cancel: () => stop(),
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
  });
};
