import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Registration, StoredKey } from './passkeys';

// Everything auth keeps, in the SQLite that ships inside Node. Four tables and
// no secret worth stealing: public keys, the hash of each session token, and
// challenges that live for five minutes. Swap this file for your own database
// without touching a caller.

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS passkey (
    credential_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
    public_key BLOB NOT NULL, alg INTEGER NOT NULL, counter INTEGER NOT NULL,
    synced INTEGER NOT NULL, transports TEXT NOT NULL,
    created_at TEXT NOT NULL, last_used TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS challenge (
    id TEXT PRIMARY KEY, value TEXT NOT NULL, user_id TEXT, expires_at TEXT NOT NULL
  );
`;

const CHALLENGE_SECONDS = 5 * 60;

type Row = Record<string, unknown>;

export type Challenge = { value: string; userId: string | null };
export type Passkey = StoredKey & { credentialId: string; userId: string; synced: boolean; createdAt: string; lastUsed: string };

export type AuthStore = ReturnType<typeof createAuthStore>;

const token = () => randomBytes(32).toString('base64url');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const later = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

export function createAuthStore(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const now = () => new Date().toISOString();
  const one = (sql: string, ...params: (string | number)[]) => db.prepare(sql).get(...params) as Row | undefined;

  const toPasskey = (r: Row): Passkey => ({
    credentialId: r.credential_id as string,
    userId: r.user_id as string,
    publicKey: new Uint8Array(r.public_key as Uint8Array),
    alg: Number(r.alg),
    counter: Number(r.counter),
    synced: r.synced === 1,
    createdAt: r.created_at as string,
    lastUsed: r.last_used as string,
  });

  return {
    /** Remembers a challenge and returns the id the browser carries back in a cookie. */
    openChallenge(value: string, userId: string | null): { id: string; maxAge: number } {
      db.prepare('DELETE FROM challenge WHERE expires_at < ?').run(now());
      const id = token();
      db.prepare('INSERT INTO challenge VALUES (?, ?, ?, ?)').run(id, value, userId, later(CHALLENGE_SECONDS));
      return { id, maxAge: CHALLENGE_SECONDS };
    },

    /** A challenge answers once. Reading it removes it, whatever the answer turns out to be. */
    takeChallenge(id: string | undefined): Challenge | null {
      if (!id) return null;
      const row = one('SELECT * FROM challenge WHERE id = ? AND expires_at >= ?', id, now());
      db.prepare('DELETE FROM challenge WHERE id = ?').run(id);
      return row ? { value: row.value as string, userId: (row.user_id as string | null) ?? null } : null;
    },

    /** Stores a new visitor and their first key together, or neither. */
    register(userId: string, key: Registration): boolean {
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO user VALUES (?, ?)').run(userId, now());
        db.prepare('INSERT INTO passkey VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          key.credentialId, userId, key.publicKey, key.alg, key.counter,
          key.synced ? 1 : 0, JSON.stringify(key.transports), now(), now(),
        );
        db.exec('COMMIT');
        return true;
      } catch (error) {
        db.exec('ROLLBACK');
        if (error instanceof Error && /UNIQUE constraint/.test(error.message)) return false;
        throw error;
      }
    },

    passkey(credentialId: string): Passkey | null {
      const row = one('SELECT * FROM passkey WHERE credential_id = ?', credentialId);
      return row ? toPasskey(row) : null;
    },

    passkeysOf(userId: string): Passkey[] {
      return (db.prepare('SELECT * FROM passkey WHERE user_id = ? ORDER BY created_at').all(userId) as Row[]).map(toPasskey);
    },

    used(credentialId: string, counter: number, synced: boolean): void {
      db.prepare('UPDATE passkey SET counter = ?, synced = ?, last_used = ? WHERE credential_id = ?')
        .run(counter, synced ? 1 : 0, now(), credentialId);
    },

    memberSince(userId: string): string | null {
      return (one('SELECT created_at FROM user WHERE id = ?', userId)?.created_at as string | undefined) ?? null;
    },

    /** Opens a session and returns the token for the cookie. Only its hash is kept. */
    openSession(userId: string, seconds: number): string {
      const value = token();
      db.prepare('INSERT INTO session VALUES (?, ?, ?)').run(hash(value), userId, later(seconds));
      return value;
    },

    session(value: string | undefined): { userId: string } | null {
      if (!value) return null;
      const row = one('SELECT user_id FROM session WHERE token_hash = ? AND expires_at >= ?', hash(value), now());
      return row ? { userId: row.user_id as string } : null;
    },

    closeSession(value: string | undefined): void {
      if (value) db.prepare('DELETE FROM session WHERE token_hash = ?').run(hash(value));
    },
  };
}
