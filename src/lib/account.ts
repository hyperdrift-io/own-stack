import { store } from './auth';

export type AccountKey = { device: string; synced: boolean; created: string; lastUsed: string };
export type Account = { memberSince: string; keys: AccountKey[] };

const day = (d: Date) => d.toISOString().slice(0, 10);

// Everything the server holds about a signed-in visitor. It is a short list on
// purpose: a public key per device, and no secret worth stealing.
export async function getAccount(userId: string): Promise<Account | null> {
  const user = await store.user.findUnique({ where: { id: userId }, include: { passkeys: true } });
  if (!user) return null;
  return {
    memberSince: day(user.createdAt),
    keys: (user.passkeys ?? []).map((k) => ({
      device: k.deviceType === 'multiDevice' ? 'synced passkey' : 'this device only',
      synced: k.backedUp,
      created: day(k.createdAt),
      lastUsed: day(k.lastUsed),
    })),
  };
}
