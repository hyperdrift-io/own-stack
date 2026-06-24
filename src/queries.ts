'use server';

import { filterFeed, getFeed, type FeedItem } from './lib/data';

// A server function used for client-initiated *data fetching* (not just a
// mutation). A client component imports and calls it like a local async
// function; React ships the call to the server and streams the result back.
//
// The return type IS the client's data type — end to end, with no API route,
// no tRPC router, no codegen, and no client-side query library (TanStack Query,
// SWR, …) holding a cache that has to be kept in sync. The server stays the
// single source of truth; the client just asks.
export async function searchFeed(query: string): Promise<FeedItem[]> {
  const all = await getFeed();
  return filterFeed(all, query);
}
