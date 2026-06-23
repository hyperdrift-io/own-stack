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
];

export async function getFeed(): Promise<FeedItem[]> {
  // Pretend this hits a database or upstream API. The caller never sees that —
  // it just gets a typed FeedItem[].
  return FEED;
}
