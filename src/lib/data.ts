// A plain server module. Server Components import and await these directly —
// the function's return type IS the component's data type, end to end, with no
// API route, no fetch, no tRPC, no codegen. The type boundary is the import.

export type FeedItem = {
  id: number;
  title: string;
  source: string;
  at: string;
};

const FEED: FeedItem[] = [
  { id: 1, title: 'React Server Components reach Vite', source: 'react.dev', at: '2026-05-02' },
  { id: 2, title: 'Waku 1.0 stabilises its public API', source: 'waku.gg', at: '2026-02-18' },
  { id: 3, title: 'Better Auth: framework-agnostic auth for TypeScript', source: 'better-auth.com', at: '2026-04-11' },
  { id: 4, title: 'Server functions land as a stable React primitive', source: 'react.dev', at: '2026-05-20' },
  { id: 5, title: 'The case against the client-side data cache', source: 'hyperdrift.io', at: '2026-06-08' },
  { id: 6, title: 'Installable web apps close the gap with native', source: 'web.dev', at: '2026-06-15' },
  { id: 7, title: 'Pure CSS is having a moment again', source: 'hyperdrift.io', at: '2026-03-30' },
  { id: 8, title: 'Vite 8 ships the RSC build pipeline', source: 'vite.dev', at: '2026-04-25' },
];

export async function getFeed(): Promise<FeedItem[]> {
  // Pretend this hits a database or upstream API. The caller never sees that —
  // it just gets a typed FeedItem[].
  return FEED;
}

// A plain server-side filter. The query layer (src/queries.ts) wraps this in a
// 'use server' boundary so the client can call it directly, fully typed.
export function filterFeed(items: FeedItem[], query: string): FeedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.source.toLowerCase().includes(q),
  );
}
