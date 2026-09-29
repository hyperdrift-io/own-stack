import { store } from './auth';

export type AccountKey = { device: string; synced: boolean; created: string; lastUsed: string };
export type Account = { memberSince: string; keys: AccountKey[] };

const day = (iso: string) => iso.slice(0, 10);

// Everything the server holds about a signed-in visitor. It is a short list on
// purpose: a public key per device, and no secret worth stealing.
export async function getAccount(userId: string): Promise<Account | null> {
  const memberSince = store.memberSince(userId);
  if (!memberSince) return null;
  return {
    memberSince: day(memberSince),
    keys: store.passkeysOf(userId).map((k) => ({
      device: k.synced ? 'synced passkey' : 'this device only',
      synced: k.synced,
      created: day(k.createdAt),
      lastUsed: day(k.lastUsed),
    })),
  };
}
