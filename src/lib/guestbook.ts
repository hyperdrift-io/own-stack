// In-memory store for the demo. Swap for a real DB without touching callers.
export type Entry = { name: string; message: string; at: string };

const entries: Entry[] = [
  { name: 'Waku', message: 'server components, no Next required', at: '2026-06-23' },
];

export async function getEntries(): Promise<Entry[]> {
  return entries.slice().reverse();
}

export async function addEntry(name: string, message: string): Promise<void> {
  entries.push({ name, message, at: new Date().toISOString().slice(0, 10) });
}
