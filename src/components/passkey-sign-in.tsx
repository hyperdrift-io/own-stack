'use client';

import { useRouter } from 'waku';
import { usePasskey } from '../lib/hooks/use-passkey';
import { passkeyMessage } from '../lib/passkey-copy';

// The sign-in island. The server answers with an HttpOnly cookie this code
// never sees. All that is left to do here is reload the route, so the server
// component renders again, this time with a session.
export function PasskeySignIn() {
  const router = useRouter();
  const { ready, busy, error, start } = usePasskey(() => router.reload());
  const message = passkeyMessage(error);

  return (
    <aside data-runtime="client">
      <h3>Your device is the password</h3>
      <p>
        No email, no form. Your device makes a key pair and keeps the private
        half; the server stores the public half and nothing else about you.
      </p>
      <p>
        <button type="button" disabled={busy || !ready} onClick={() => start('register')}>
          Create a passkey
        </button>{' '}
        <button type="button" disabled={busy || !ready} onClick={() => start('authenticate')}>
          I already have one
        </button>
      </p>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
