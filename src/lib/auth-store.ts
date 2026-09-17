import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AuthPrismaClient, AuthUser, PasskeyRecord, SessionRecord } from '@yannvr/auth/server';

// @yannvr/auth never picks your database: it asks for an object shaped like the
// handful of Prisma calls it makes. This is that object over `node:sqlite`, the
// SQLite that ships inside Node — so the example adds no dependency. Swap it
// for your real client (Prisma, Drizzle, Postgres) without touching a caller.

type Row = Record<string, unknown>;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS passkey (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
    credential_id TEXT NOT NULL UNIQUE, public_key BLOB NOT NULL, counter INTEGER NOT NULL,
    device_type TEXT NOT NULL, backed_up INTEGER NOT NULL, transports TEXT NOT NULL,
    created_at TEXT NOT NULL, last_used TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
    token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
  );
`;

const toUser = (r: Row): AuthUser => ({
  id: r.id as string,
  email: r.email as string,
  name: r.name as string | null,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

const toPasskey = (r: Row): PasskeyRecord => ({
  id: r.id as string,
  userId: r.user_id as string,
  credentialId: r.credential_id as string,
  publicKey: r.public_key as Uint8Array,
  counter: Number(r.counter),
  deviceType: r.device_type as string,
  backedUp: r.backed_up === 1,
  transports: JSON.parse(r.transports as string) as string[],
  createdAt: new Date(r.created_at as string),
  lastUsed: new Date(r.last_used as string),
});

const toSession = (r: Row): SessionRecord => ({
  id: r.id as string,
  userId: r.user_id as string,
  token: r.token as string,
  expiresAt: new Date(r.expires_at as string),
  createdAt: new Date(r.created_at as string),
});

export function createSqliteAuthStore(path: string): AuthPrismaClient {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const one = (sql: string, ...params: (string | number | Uint8Array)[]) =>
    db.prepare(sql).get(...params) as Row | undefined;
  const passkeysOf = (userId: string) =>
    (db.prepare('SELECT * FROM passkey WHERE user_id = ? ORDER BY created_at').all(userId) as Row[]).map(toPasskey);
  const now = () => new Date().toISOString();

  return {
    user: {
      async findUnique({ where, include }) {
        const row = where.id ? one('SELECT * FROM user WHERE id = ?', where.id) : one('SELECT * FROM user WHERE email = ?', where.email ?? '');
        if (!row) return null;
        return include?.passkeys ? { ...toUser(row), passkeys: passkeysOf(row.id as string) } : toUser(row);
      },
      async create({ data }) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO user VALUES (?, ?, ?, ?, ?)').run(id, data.email, data.name ?? null, now(), now());
        return { ...toUser(one('SELECT * FROM user WHERE id = ?', id)!), passkeys: [] };
      },
    },
    passkey: {
      async create({ data }) {
        const id = crypto.randomUUID();
        try {
          db.prepare('INSERT INTO passkey VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            id, data.userId as string, data.credentialId as string, data.publicKey as Uint8Array,
            Number(data.counter), data.deviceType as string, data.backedUp ? 1 : 0,
            JSON.stringify(data.transports ?? []), now(), now(),
          );
        } catch (err) {
          // The package recognises a duplicate credential by Prisma's code for it.
          if (err instanceof Error && /UNIQUE constraint/.test(err.message)) throw Object.assign(err, { code: 'P2002' });
          throw err;
        }
        return toPasskey(one('SELECT * FROM passkey WHERE id = ?', id)!);
      },
      async update({ where, data }) {
        db.prepare('UPDATE passkey SET counter = ?, last_used = ? WHERE id = ?').run(Number(data.counter), now(), where.id);
        return toPasskey(one('SELECT * FROM passkey WHERE id = ?', where.id)!);
      },
      // Lets a returning visitor sign in with no email: the browser offers the passkey, we look it up.
      async findFirst({ where }) {
        const row = one('SELECT * FROM passkey WHERE credential_id = ?', where.credentialId);
        return row ? toPasskey(row) : null;
      },
    },
    session: {
      async create({ data }) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?)').run(id, data.userId, data.token, data.expiresAt.toISOString(), now());
        return toSession(one('SELECT * FROM session WHERE id = ?', id)!);
      },
      async delete({ where }) {
        const row = one('SELECT * FROM session WHERE token = ?', where.token);
        if (!row) throw new Error('Session not found');
        db.prepare('DELETE FROM session WHERE token = ?').run(where.token);
        return toSession(row);
      },
      async findUnique({ where }) {
        const row = one('SELECT * FROM session WHERE token = ?', where.token);
        return row ? toSession(row) : null;
      },
    },
  };
}
