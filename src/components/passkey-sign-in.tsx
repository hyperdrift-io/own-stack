'use client';

import { usePasskeyLogin } from '@yannvr/auth/client';
import { useRouter } from 'waku';
import { passkeyMessage } from '../lib/passkey-copy';

// The sign-in island. The hook runs the WebAuthn ceremony against /api/auth/*;
// the server answers with an HttpOnly cookie this code never sees. All that is
// left to do here is reload the route, so the server component renders again —
// this time with a session.
export function PasskeySignIn() {
  const router = useRouter();
  const { register, authenticate, step, error, isSupported } = usePasskeyLogin();
  const busy = step === 'loading';
  const message = passkeyMessage(error);

  const run = async (ceremony: () => Promise<unknown>) => {
    if (await ceremony()) await router.reload();
  };

  return (
    <aside data-runtime="client">
      <h3>Your device is the password</h3>
      <p>
        No email, no form. Your device makes a key pair and keeps the private
        half; the server stores the public half and nothing else about you.
      </p>
      <p>
        <button type="button" disabled={busy || !isSupported} onClick={() => run(() => register())}>
          Create a passkey
        </button>{' '}
        <button type="button" disabled={busy || !isSupported} onClick={() => run(() => authenticate(''))}>
          I already have one
        </button>
      </p>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
