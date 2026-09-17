import { useEffect, useState } from 'react';
import type { Entry } from '../guestbook';

// Subscribes to /api/events for as long as the component is mounted.
// EventSource reconnects on its own, so an error only flips `open` until it does.
export function useGuestbookWire(): { open: boolean; since: string; signed: Entry[] } {
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState('');
  const [signed, setSigned] = useState<Entry[]>([]);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onopen = () => setOpen(true);
    source.onerror = () => setOpen(false);
    source.addEventListener('hello', (e) => setSince((JSON.parse(e.data) as { at: string }).at));
    source.addEventListener('signed', (e) =>
      setSigned((list) => [JSON.parse(e.data) as Entry, ...list].slice(0, 5)),
    );
    return () => source.close();
  }, []);

  return { open, since, signed };
}
