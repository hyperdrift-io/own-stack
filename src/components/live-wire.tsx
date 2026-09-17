'use client';

import { useGuestbookWire } from '../lib/hooks/use-guestbook-wire';

// A client island on the far end of /api/events. The server pushes; this only
// listens. `data-runtime` and `data-open` carry the look — no class needed.
export function LiveWire() {
  const { open, since, signed } = useGuestbookWire();
  return (
    <aside data-runtime="client" aria-live="polite">
      <h3>Live from /api/events</h3>
      <p>
        <output data-open={open}>{open ? 'connected' : 'connecting'}</output>
        {since && <> · the server said hello at <time>{since.slice(11, 19)}</time> UTC</>}
      </p>
      <p>
        Sign the <a href="/guestbook" target="_blank" rel="noreferrer">guestbook</a> in
        another tab. Your note lands here without a reload.
      </p>
      <ol>
        {signed.map((entry, i) => (
          <li key={signed.length - i}>
            <b>{entry.name}</b> {entry.message}
          </li>
        ))}
      </ol>
    </aside>
  );
}
