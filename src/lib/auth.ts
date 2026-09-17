import { randomBytes } from 'node:crypto';
import { createAuth, createWebAuthnConfig } from '@yannvr/auth/server';
import { createSqliteAuthStore } from './auth-store';

// The one place auth is configured. `origin` is fixed here or in the
// environment and never read from a request: a passkey is bound to an origin,
// and a server that takes the caller's word for its own address gives that away.
const origin =
  process.env.ORIGIN ??
  (process.env.NODE_ENV === 'production' ? 'https://own-stack.hyperdrift.io' : 'http://localhost:3000');

// Set JWT_SECRET in production. Without it the demo signs with a key that lives
// as long as the process: everything works, and a restart signs everyone out.
const jwtSecret = process.env.JWT_SECRET ?? randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('[auth] JWT_SECRET is not set — sessions last until the next restart');

export const store = createSqliteAuthStore(process.env.AUTH_DB ?? '.data/auth.db');

export const auth = createAuth({
  webAuthnConfig: createWebAuthnConfig({ rpName: 'own-stack', rpID: new URL(origin).hostname, origin }),
  prisma: store,
  jwtSecret,
});
