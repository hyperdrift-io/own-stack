import { AsyncLocalStorage } from 'node:async_hooks';
import type { MiddlewareHandler } from 'hono';

// A server function returns data, not a Response, so it has nowhere to put a
// Set-Cookie header. This middleware gives it one: `queueCookie()` collects
// header values during the request, and they are appended once the response
// exists. The store hangs off globalThis because the middleware and the server
// functions can be bundled separately and still have to share it.
const KEY = Symbol.for('own-stack.response-cookies');
const holder = globalThis as { [KEY]?: AsyncLocalStorage<string[]> };
const storage = (holder[KEY] ??= new AsyncLocalStorage<string[]>());

/** Queue one serialised `Set-Cookie` value for the response to this request. */
export function queueCookie(cookie: string): void {
  const queue = storage.getStore();
  if (!queue) throw new Error('queueCookie() called outside a request');
  queue.push(cookie);
}

const responseCookies = (): MiddlewareHandler => async (c, next) => {
  const queue: string[] = [];
  await storage.run(queue, next);
  for (const cookie of queue) c.res.headers.append('Set-Cookie', cookie);
};

export default responseCookies;
