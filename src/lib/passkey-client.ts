// The browser's half of the passkey ceremony. The browser turns the server's
// JSON into a passkey request and its answer back into JSON: those two calls
// are the whole of the client's WebAuthn code.

export type Ceremony = 'register' | 'authenticate';

const VERIFY: Record<Ceremony, string> = { register: 'verify-registration', authenticate: 'verify-authentication' };

export const passkeysSupported = (): boolean =>
  typeof PublicKeyCredential !== 'undefined' &&
  typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' &&
  typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function';

async function post(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/auth/passkey/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'failed');
  return data;
}

/** Runs one ceremony to the end. Resolves once the server has set the session cookie. */
export async function runPasskey(ceremony: Ceremony): Promise<void> {
  const options = await post(ceremony);
  const credential =
    ceremony === 'register'
      ? await navigator.credentials.create({
          publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options as unknown as PublicKeyCredentialCreationOptionsJSON),
        })
      : await navigator.credentials.get({
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options as unknown as PublicKeyCredentialRequestOptionsJSON),
        });
  if (!(credential instanceof PublicKeyCredential)) throw new Error('not allowed');
  await post(VERIFY[ceremony], credential.toJSON());
}
