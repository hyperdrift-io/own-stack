import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ecdsaDerToRaw,
  fromBase64Url,
  newChallenge,
  PasskeyError,
  toBase64Url,
  verifyAuthentication,
  verifyRegistration,
  type PasskeyFailure,
  type RelyingParty,
} from './passkeys.ts';

// A software authenticator: it does what a device does, with keys made in the
// test. Every check the server makes is exercised against a real signature.

const rp: RelyingParty = { id: 'localhost', origin: 'http://localhost:3000' };
const encode = (text: string) => new TextEncoder().encode(text);
const digest = async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));

const KEYGEN: Record<number, { generate: EcKeyGenParams | RsaHashedKeyGenParams | AlgorithmIdentifier; sign: AlgorithmIdentifier | EcdsaParams }> = {
  [-7]: { generate: { name: 'ECDSA', namedCurve: 'P-256' }, sign: { name: 'ECDSA', hash: 'SHA-256' } },
  [-8]: { generate: { name: 'Ed25519' }, sign: { name: 'Ed25519' } },
  [-257]: {
    generate: { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    sign: { name: 'RSASSA-PKCS1-v1_5' },
  },
};

function rawToDer(raw: Uint8Array): Uint8Array {
  const integer = (bytes: Uint8Array) => {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    const body = bytes[start]! & 0x80 ? [0, ...bytes.subarray(start)] : [...bytes.subarray(start)];
    return [0x02, body.length, ...body];
  };
  const body = [...integer(raw.subarray(0, 32)), ...integer(raw.subarray(32))];
  return new Uint8Array([0x30, body.length, ...body]);
}

type Overrides = {
  site?: string;
  origin?: string;
  type?: string;
  challenge?: string;
  flags?: number;
  counter?: number;
  crossOrigin?: boolean;
};

async function authenticator(alg = -7) {
  const spec = KEYGEN[alg]!;
  const pair = (await crypto.subtle.generateKey(spec.generate, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  const credentialId = crypto.getRandomValues(new Uint8Array(20));

  const authenticatorData = async (o: Overrides, attested: boolean) => {
    const counter = new Uint8Array(4);
    new DataView(counter.buffer).setUint32(0, o.counter ?? 0);
    const head = [...(await digest(encode(o.site ?? rp.id))), o.flags ?? (attested ? 0x45 : 0x05), ...counter];
    // After the credential id a real device appends its key in COSE form. The
    // server reads the key from `response.publicKey`, so any bytes stand in.
    const tail = attested ? [...new Uint8Array(16), 0, credentialId.length, ...credentialId, 0xa5, 0x01, 0x02] : [];
    return new Uint8Array([...head, ...tail]);
  };

  const clientData = (o: Overrides, type: string, challenge: string) =>
    encode(JSON.stringify({ type: o.type ?? type, challenge: o.challenge ?? challenge, origin: o.origin ?? rp.origin, crossOrigin: o.crossOrigin ?? false }));

  return {
    publicKey,
    alg,
    async create(challenge: string, o: Overrides = {}) {
      return {
        id: toBase64Url(credentialId),
        rawId: toBase64Url(credentialId),
        type: 'public-key',
        response: {
          clientDataJSON: toBase64Url(clientData(o, 'webauthn.create', challenge)),
          authenticatorData: toBase64Url(await authenticatorData(o, true)),
          publicKey: toBase64Url(publicKey),
          publicKeyAlgorithm: alg,
          transports: ['internal', 'hybrid'],
        },
      };
    },
    async get(challenge: string, o: Overrides = {}) {
      const data = await authenticatorData(o, false);
      const client = clientData(o, 'webauthn.get', challenge);
      const signed = new Uint8Array([...data, ...(await digest(client))]);
      const signature = new Uint8Array(await crypto.subtle.sign(spec.sign, pair.privateKey, signed as BufferSource));
      return {
        id: toBase64Url(credentialId),
        type: 'public-key',
        response: {
          clientDataJSON: toBase64Url(client),
          authenticatorData: toBase64Url(data),
          signature: toBase64Url(alg === -7 ? rawToDer(signature) : signature),
        },
      };
    },
  };
}

const fails = (promise: Promise<unknown>, code: PasskeyFailure) =>
  assert.rejects(promise, (error) => error instanceof PasskeyError && error.code === code);

for (const [alg, name] of [[-7, 'ES256'], [-8, 'Ed25519'], [-257, 'RS256']] as const) {
  test(`${name}: a registration is stored and its sign-in is accepted`, async () => {
    const device = await authenticator(alg);
    const challenge = newChallenge();

    const stored = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
    assert.equal(stored.alg, alg);
    assert.deepEqual(stored.publicKey, device.publicKey);
    assert.deepEqual(stored.transports, ['internal', 'hybrid']);

    const next = newChallenge();
    const result = await verifyAuthentication({ credential: await device.get(next), challenge: next, rp, stored });
    assert.deepEqual(result, { counter: 0, synced: false });
  });
}

test('registration: an answer to another challenge is refused', async () => {
  const device = await authenticator();
  await fails(verifyRegistration({ credential: await device.create(newChallenge()), challenge: newChallenge(), rp }), 'wrong_challenge');
});

test('registration: an answer made on another origin is refused', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  await fails(verifyRegistration({ credential: await device.create(challenge, { origin: 'https://evil.example' }), challenge, rp }), 'wrong_origin');
  await fails(verifyRegistration({ credential: await device.create(challenge, { crossOrigin: true }), challenge, rp }), 'wrong_origin');
});

test('registration: a sign-in answer cannot be replayed as a registration', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  await fails(verifyRegistration({ credential: await device.create(challenge, { type: 'webauthn.get' }), challenge, rp }), 'wrong_type');
});

test('registration: a key made for another site is refused', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  await fails(verifyRegistration({ credential: await device.create(challenge, { site: 'evil.example' }), challenge, rp }), 'wrong_site');
});

test('registration: presence and verification of the person are both required', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  await fails(verifyRegistration({ credential: await device.create(challenge, { flags: 0x44 }), challenge, rp }), 'user_not_present');
  await fails(verifyRegistration({ credential: await device.create(challenge, { flags: 0x41 }), challenge, rp }), 'user_not_verified');
});

test('registration: the credential id must be the one the authenticator reported', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const credential = await device.create(challenge);
  await fails(verifyRegistration({ credential: { ...credential, id: toBase64Url(new Uint8Array(20)) }, challenge, rp }), 'credential_mismatch');
});

test('registration: a missing or unusable public key is refused', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const credential = await device.create(challenge);
  const without = (key: string) => ({ ...credential, response: Object.fromEntries(Object.entries(credential.response).filter(([k]) => k !== key)) });

  await fails(verifyRegistration({ credential: without('publicKey'), challenge, rp }), 'no_public_key');
  await fails(verifyRegistration({ credential: without('authenticatorData'), challenge, rp }), 'no_public_key');
  await fails(verifyRegistration({ credential: { ...credential, response: { ...credential.response, publicKeyAlgorithm: -999 } }, challenge, rp }), 'unsupported_algorithm');
  await fails(verifyRegistration({ credential: { ...credential, response: { ...credential.response, publicKeyAlgorithm: -257 } }, challenge, rp }), 'no_public_key');
});

test('registration: anything that is not the expected shape is refused', async () => {
  const challenge = newChallenge();
  for (const credential of [null, 'text', 42, {}, { response: {} }, { response: { clientDataJSON: 'not base64 !' } }]) {
    await fails(verifyRegistration({ credential, challenge, rp }), 'malformed');
  }
});

test('sign-in: every binding is checked', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const stored = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
  const attempt = async (o: Overrides) => verifyAuthentication({ credential: await device.get(challenge, o), challenge, rp, stored });

  await fails(attempt({ challenge: newChallenge() }), 'wrong_challenge');
  await fails(attempt({ origin: 'https://evil.example' }), 'wrong_origin');
  await fails(attempt({ type: 'webauthn.create' }), 'wrong_type');
  await fails(attempt({ site: 'evil.example' }), 'wrong_site');
  await fails(attempt({ flags: 0x04 }), 'user_not_present');
  await fails(attempt({ flags: 0x01 }), 'user_not_verified');
});

test('sign-in: a signature from another key is refused', async () => {
  const device = await authenticator();
  const other = await authenticator();
  const challenge = newChallenge();
  const stored = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
  await fails(verifyAuthentication({ credential: await other.get(challenge), challenge, rp, stored }), 'bad_signature');
});

test('sign-in: changing one signed byte breaks the signature', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const stored = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
  const credential = await device.get(challenge, { counter: 1 });

  const data = fromBase64Url(credential.response.authenticatorData);
  data[36] = 9; // the counter's last byte: the authenticator signed 1
  const tampered = { ...credential, response: { ...credential.response, authenticatorData: toBase64Url(data) } };
  await fails(verifyAuthentication({ credential: tampered, challenge, rp, stored }), 'bad_signature');
});

test('sign-in: a counter only counts up', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const registered = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
  const at = (counter: number) => ({ ...registered, counter });
  const attempt = async (stored: typeof registered, counter: number) =>
    verifyAuthentication({ credential: await device.get(challenge, { counter }), challenge, rp, stored });

  assert.equal((await attempt(at(4), 5)).counter, 5);
  await fails(attempt(at(5), 5), 'counter_regressed');
  await fails(attempt(at(5), 2), 'counter_regressed');
  await fails(attempt(at(5), 0), 'counter_regressed');
  assert.equal((await attempt(at(0), 0)).counter, 0);
});

test('sign-in: a synced passkey is reported as synced', async () => {
  const device = await authenticator();
  const challenge = newChallenge();
  const stored = await verifyRegistration({ credential: await device.create(challenge), challenge, rp });
  const result = await verifyAuthentication({ credential: await device.get(challenge, { flags: 0x1d }), challenge, rp, stored });
  assert.equal(result.synced, true);
});

test('ECDSA signatures: only a well-formed sequence of two integers converts', () => {
  const raw = new Uint8Array(64);
  raw[0] = 0x80; // r has its top bit set, so DER carries a leading zero
  raw[31] = 1;
  raw[63] = 7; // s is small, so DER carries one byte
  assert.deepEqual(ecdsaDerToRaw(rawToDer(raw)), raw);

  const der = rawToDer(crypto.getRandomValues(new Uint8Array(64)));
  const bad = (bytes: Uint8Array) => assert.throws(() => ecdsaDerToRaw(bytes), (e) => e instanceof PasskeyError && e.code === 'bad_signature');
  bad(new Uint8Array(0));
  bad(der.subarray(0, der.length - 1));
  bad(new Uint8Array([...der, 0]));
  bad(new Uint8Array([0x31, ...der.subarray(1)]));
  bad(new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x01, 0x03, 0x01, 0x01]));
});
