// In-memory store for the demo. Swap for a real DB without touching callers.
export type Entry = { name: string; message: string; at: string };

const entries: Entry[] = [
  { name: 'Waku', message: 'server components, no Next required', at: '2026-06-23' },
];

// Whoever wants to hear about new entries — today, the SSE endpoint.
const listeners = new Set<(entry: Entry) => void>();

export async function getEntries(): Promise<Entry[]> {
  return entries.slice().reverse();
}

export async function addEntry(name: string, message: string): Promise<void> {
  const entry = { name, message, at: new Date().toISOString().slice(0, 10) };
  entries.push(entry);
  if (entries.length > 50) entries.shift(); // a public demo: memory stays bounded
  listeners.forEach((tell) => tell(entry));
}

export function subscribe(tell: (entry: Entry) => void): () => void {
  listeners.add(tell);
  return () => listeners.delete(tell);
}
