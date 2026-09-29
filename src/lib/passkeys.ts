// Passkey verification on the platform's own primitives: WebCrypto and the
// JSON the browser hands over from `credential.toJSON()`. No library.
//
// The browser gives the public key as SPKI (`response.publicKey`), so nothing
// here decodes CBOR. Registration runs with attestation "none": the device's
// make and model are not our business, and nothing is signed at that step for a
// server to check. What is checked, at both steps, is that the answer was made
// for this challenge, on this origin, for this site, by a person who was there.

export type RelyingParty = {
  /** The site's registrable domain, e.g. `own-stack.hyperdrift.io`. */
  id: string;
  /** The exact origin the page is served from, scheme and port included. */
  origin: string;
};

export type StoredKey = { publicKey: Uint8Array; alg: number; counter: number };

export type Registration = StoredKey & {
  credentialId: string;
  synced: boolean;
  transports: string[];
};

export type PasskeyFailure =
  | 'malformed'
  | 'wrong_type'
  | 'wrong_challenge'
  | 'wrong_origin'
  | 'wrong_site'
  | 'user_not_present'
  | 'user_not_verified'
  | 'no_public_key'
  | 'unsupported_algorithm'
  | 'credential_mismatch'
  | 'bad_signature'
  | 'counter_regressed';

export class PasskeyError extends Error {
  readonly code: PasskeyFailure;
  constructor(code: PasskeyFailure) {
    super(code);
    this.name = 'PasskeyError';
    this.code = code;
  }
}

// COSE algorithm numbers, in the order we ask browsers to prefer them.
export const ALGORITHMS = [-7, -8, -257] as const;

type KeyParams = { importParams: AlgorithmIdentifier | EcKeyImportParams | RsaHashedImportParams; verifyParams: AlgorithmIdentifier | EcdsaParams };

const KEY_PARAMS: Record<number, KeyParams> = {
  [-7]: { importParams: { name: 'ECDSA', namedCurve: 'P-256' }, verifyParams: { name: 'ECDSA', hash: 'SHA-256' } },
  [-8]: { importParams: { name: 'Ed25519' }, verifyParams: { name: 'Ed25519' } },
  [-257]: { importParams: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, verifyParams: { name: 'RSASSA-PKCS1-v1_5' } },
};

const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const FLAG_BACKED_UP = 0x10;
const FLAG_ATTESTED_CREDENTIAL = 0x40;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !BASE64URL.test(value)) throw new PasskeyError('malformed');
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

/** A fresh challenge: 32 random bytes, as the base64url string the browser expects. */
export function newChallenge(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

const field = (source: unknown, key: string): unknown =>
  typeof source === 'object' && source !== null ? (source as Record<string, unknown>)[key] : undefined;

const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

// What the browser says it did: which ceremony, for which challenge, on which
// origin. The authenticator signs a hash of these exact bytes.
function checkClientData(bytes: Uint8Array, type: string, challenge: string, rp: RelyingParty): void {
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new PasskeyError('malformed');
  }
  if (field(data, 'type') !== type) throw new PasskeyError('wrong_type');
  if (field(data, 'challenge') !== challenge) throw new PasskeyError('wrong_challenge');
  if (field(data, 'origin') !== rp.origin || field(data, 'crossOrigin') === true) throw new PasskeyError('wrong_origin');
}

type AuthenticatorData = { counter: number; synced: boolean; credentialId: Uint8Array | null };

// What the authenticator says it did: for which site, with the person present
// and verified, and how many times this key has signed.
async function readAuthenticatorData(bytes: Uint8Array, rp: RelyingParty): Promise<AuthenticatorData> {
  if (bytes.length < 37) throw new PasskeyError('malformed');
  const site = await sha256(new TextEncoder().encode(rp.id));
  if (!sameBytes(bytes.subarray(0, 32), site)) throw new PasskeyError('wrong_site');

  const flags = bytes[32]!;
  if (!(flags & FLAG_USER_PRESENT)) throw new PasskeyError('user_not_present');
  if (!(flags & FLAG_USER_VERIFIED)) throw new PasskeyError('user_not_verified');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const counter = view.getUint32(33);

  let credentialId: Uint8Array | null = null;
  if (flags & FLAG_ATTESTED_CREDENTIAL) {
    if (bytes.length < 55) throw new PasskeyError('malformed');
    const length = view.getUint16(53);
    if (bytes.length < 55 + length) throw new PasskeyError('malformed');
    credentialId = bytes.subarray(55, 55 + length);
  }
  return { counter, synced: Boolean(flags & FLAG_BACKED_UP), credentialId };
}

async function importKey(publicKey: Uint8Array, alg: number): Promise<{ key: CryptoKey; params: KeyParams }> {
  const params = KEY_PARAMS[alg];
  if (!params) throw new PasskeyError('unsupported_algorithm');
  try {
    const key = await crypto.subtle.importKey('spki', publicKey as BufferSource, params.importParams, false, ['verify']);
    return { key, params };
  } catch {
    throw new PasskeyError('no_public_key');
  }
}

// Authenticators sign ECDSA as an ASN.1 sequence of two integers; WebCrypto
// verifies the two 32-byte values laid end to end.
export function ecdsaDerToRaw(der: Uint8Array): Uint8Array {
  const fail = () => new PasskeyError('bad_signature');
  if (der.length < 8 || der[0] !== 0x30 || der[1] !== der.length - 2) throw fail();

  const raw = new Uint8Array(64);
  let offset = 2;
  for (const slot of [0, 32]) {
    if (der[offset] !== 0x02) throw fail();
    const length = der[offset + 1]!;
    let start = offset + 2;
    const end = start + length;
    if (length === 0 || end > der.length) throw fail();
    while (start < end - 1 && der[start] === 0) start++;
    if (end - start > 32) throw fail();
    raw.set(der.subarray(start, end), slot + 32 - (end - start));
    offset = end;
  }
  if (offset !== der.length) throw fail();
  return raw;
}

/** Checks the answer to `navigator.credentials.create()` and returns what to store. */
export async function verifyRegistration(input: {
  credential: unknown;
  challenge: string;
  rp: RelyingParty;
}): Promise<Registration> {
  const { credential, challenge, rp } = input;
  const response = field(credential, 'response');

  checkClientData(fromBase64Url(field(response, 'clientDataJSON')), 'webauthn.create', challenge, rp);

  const authenticatorData = field(response, 'authenticatorData');
  if (authenticatorData === undefined) throw new PasskeyError('no_public_key');
  const data = await readAuthenticatorData(fromBase64Url(authenticatorData), rp);

  const credentialId = field(credential, 'id');
  if (!data.credentialId || credentialId !== toBase64Url(data.credentialId)) throw new PasskeyError('credential_mismatch');

  const publicKey = field(response, 'publicKey');
  const alg = field(response, 'publicKeyAlgorithm');
  if (typeof publicKey !== 'string' || typeof alg !== 'number') throw new PasskeyError('no_public_key');
  const spki = fromBase64Url(publicKey);
  await importKey(spki, alg);

  const transports = field(response, 'transports');
  return {
    credentialId: credentialId as string,
    publicKey: spki,
    alg,
    counter: data.counter,
    synced: data.synced,
    transports: Array.isArray(transports) ? transports.filter((t): t is string => typeof t === 'string').slice(0, 8) : [],
  };
}

/** Checks the answer to `navigator.credentials.get()` against the stored key. */
export async function verifyAuthentication(input: {
  credential: unknown;
  challenge: string;
  rp: RelyingParty;
  stored: StoredKey;
}): Promise<{ counter: number; synced: boolean }> {
  const { credential, challenge, rp, stored } = input;
  const response = field(credential, 'response');

  const clientData = fromBase64Url(field(response, 'clientDataJSON'));
  checkClientData(clientData, 'webauthn.get', challenge, rp);

  const authenticatorData = fromBase64Url(field(response, 'authenticatorData'));
  const data = await readAuthenticatorData(authenticatorData, rp);

  const { key, params } = await importKey(stored.publicKey, stored.alg);
  const signed = new Uint8Array(authenticatorData.length + 32);
  signed.set(authenticatorData);
  signed.set(await sha256(clientData), authenticatorData.length);

  const signature = fromBase64Url(field(response, 'signature'));
  const ok = await crypto.subtle.verify(
    params.verifyParams,
    key,
    (stored.alg === -7 ? ecdsaDerToRaw(signature) : signature) as BufferSource,
    signed as BufferSource,
  );
  if (!ok) throw new PasskeyError('bad_signature');

  // Synced passkeys report 0 forever. A key that counts must only count up:
  // a number that stands still or goes back means two devices hold one key.
  if ((stored.counter > 0 || data.counter > 0) && data.counter <= stored.counter) {
    throw new PasskeyError('counter_regressed');
  }
  return { counter: data.counter, synced: data.synced };
}
