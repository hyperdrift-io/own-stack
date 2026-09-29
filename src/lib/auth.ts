import { createAuthStore, type AuthStore } from './auth-store';
import {
  ALGORITHMS,
  newChallenge,
  PasskeyError,
  toBase64Url,
  verifyAuthentication,
  verifyRegistration,
  type RelyingParty,
} from './passkeys';

// The one place auth is configured and the whole of its surface: a handler for
// /api/auth/*, a session reader, and sign-out. Plain Request → Response.

const SESSION_COOKIE = 'session';
const CHALLENGE_COOKIE = 'passkey_challenge';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const MAX_BODY_BYTES = 16 * 1024;

export type Session = { userId: string };

export type AuthConfig = {
  /** Shown by the browser in the passkey prompt. */
  name: string;
  /** Fixed in configuration, never read from a request. */
  origin: string;
  store: AuthStore;
  secureCookies: boolean;
  basePath?: string;
};

function readCookie(headers: Headers, name: string): string | undefined {
  for (const pair of (headers.get('cookie') ?? '').split(';')) {
    const eq = pair.indexOf('=');
    if (eq > 0 && pair.slice(0, eq).trim() === name) return pair.slice(eq + 1).trim();
  }
  return undefined;
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new PasskeyError('malformed');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new PasskeyError('malformed');
  }
}

export function createAuth({ name, origin, store, secureCookies, basePath = '/api/auth' }: AuthConfig) {
  const rp: RelyingParty = { id: new URL(origin).hostname, origin };
  const prefix = `${basePath.replace(/\/+$/, '')}/`;

  // Both cookies carry random tokens, so nothing in them needs escaping.
  const cookie = (key: string, value: string, maxAge: number) =>
    [`${key}=${value}`, `Max-Age=${maxAge}`, 'Path=/', 'HttpOnly', ...(secureCookies ? ['Secure'] : []), 'SameSite=Lax'].join('; ');

  const json = (body: unknown, status = 200, cookies: string[] = []) => {
    const response = Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    for (const value of cookies) response.headers.append('Set-Cookie', value);
    return response;
  };

  const withChallenge = (options: Record<string, unknown>, userId: string | null) => {
    const challenge = newChallenge();
    const { id, maxAge } = store.openChallenge(challenge, userId);
    return json({ ...options, challenge }, 200, [cookie(CHALLENGE_COOKIE, id, maxAge)]);
  };

  const signedIn = (userId: string) =>
    json({ ok: true }, 200, [
      cookie(SESSION_COOKIE, store.openSession(userId, SESSION_SECONDS), SESSION_SECONDS),
      cookie(CHALLENGE_COOKIE, '', 0),
    ]);

  const routes: Record<string, (request: Request) => Promise<Response> | Response> = {
    // A new visitor: a fresh user handle, and a key that lives on the device so
    // that signing in later needs no name and no email.
    'passkey/register': () => {
      const userId = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
      return withChallenge(
        {
          rp: { id: rp.id, name },
          user: { id: userId, name: `visitor ${userId.slice(0, 8)}`, displayName: `${name} visitor` },
          pubKeyCredParams: ALGORITHMS.map((alg) => ({ type: 'public-key', alg })),
          authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
          attestation: 'none',
          timeout: 60_000,
        },
        userId,
      );
    },

    'passkey/verify-registration': async (request) => {
      const challenge = store.takeChallenge(readCookie(request.headers, CHALLENGE_COOKIE));
      if (!challenge?.userId) return json({ error: 'challenge_expired' }, 400);

      const key = await verifyRegistration({ credential: await readJson(request), challenge: challenge.value, rp });
      if (!store.register(challenge.userId, key)) return json({ error: 'already_registered' }, 409);
      return signedIn(challenge.userId);
    },

    // A returning visitor: no list of allowed keys, so the browser offers
    // whichever passkey it holds for this site.
    'passkey/authenticate': () =>
      withChallenge({ rpId: rp.id, allowCredentials: [], userVerification: 'required', timeout: 60_000 }, null),

    'passkey/verify-authentication': async (request) => {
      const challenge = store.takeChallenge(readCookie(request.headers, CHALLENGE_COOKIE));
      if (!challenge) return json({ error: 'challenge_expired' }, 400);

      const credential = await readJson(request);
      const id = (credential as { id?: unknown } | null)?.id;
      const passkey = typeof id === 'string' ? store.passkey(id) : null;
      if (!passkey) return json({ error: 'no_passkey' }, 404);

      const { counter, synced } = await verifyAuthentication({ credential, challenge: challenge.value, rp, stored: passkey });
      store.used(passkey.credentialId, counter, synced);
      return signedIn(passkey.userId);
    },

    'sign-out': (request) => json({ ok: true }, 200, [auth.signOut(request.headers)]),
  };

  const auth = {
    /** One handler for every auth route. Mount it on `{basePath}/*`. */
    async handleAuth(request: Request): Promise<Response> {
      const { pathname } = new URL(request.url);
      const route = pathname.startsWith(prefix) ? routes[pathname.slice(prefix.length).replace(/\/+$/, '')] : undefined;
      if (!route) return json({ error: 'not_found' }, 404);
      if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });

      // Browsers send Origin on every POST. One that is not ours has no business here.
      const from = request.headers.get('origin');
      if (from && from !== origin) return json({ error: 'origin_not_allowed' }, 403);

      try {
        return await route(request);
      } catch (error) {
        if (error instanceof PasskeyError) return json({ error: error.code }, 400, [cookie(CHALLENGE_COOKIE, '', 0)]);
        throw error;
      }
    },

    /** The signed-in visitor behind these request headers, or null. */
    readSession: (headers: Headers): Session | null => store.session(readCookie(headers, SESSION_COOKIE)),

    /** Ends the session and returns the `Set-Cookie` value that clears it. */
    signOut(headers: Headers): string {
      store.closeSession(readCookie(headers, SESSION_COOKIE));
      return cookie(SESSION_COOKIE, '', 0);
    },
  };
  return auth;
}

// `origin` is fixed here or in the environment and never read from a request:
// a passkey is bound to an origin, and a server that takes the caller's word
// for its own address gives that away.
const origin =
  process.env.ORIGIN ??
  (process.env.NODE_ENV === 'production' ? 'https://own-stack.hyperdrift.io' : 'http://localhost:3000');

export const store = createAuthStore(process.env.AUTH_DB ?? '.data/passkeys.db');

export const auth = createAuth({
  name: 'own-stack',
  origin,
  store,
  secureCookies: process.env.NODE_ENV === 'production',
});
