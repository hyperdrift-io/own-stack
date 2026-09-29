'use client';

import { useEffect, useState } from 'react';
import { passkeysSupported, runPasskey, type Ceremony } from '../passkey-client';

/** State for the sign-in island: whether passkeys work here, and how the last attempt went. */
export function usePasskey(onSignedIn: () => unknown) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Known only in the browser, so the server and the first client render agree.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(passkeysSupported()), []);

  const start = async (ceremony: Ceremony) => {
    setBusy(true);
    setError(null);
    try {
      await runPasskey(ceremony);
      await onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  return { ready, busy, error, start };
}
