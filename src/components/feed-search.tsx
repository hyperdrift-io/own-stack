'use client';

import { useState, useTransition } from 'react';
import { searchFeed } from '../queries';
import type { FeedItem } from '../lib/data';

// A client island that fetches data on its own — the job people usually hand to
// TanStack Query / SWR. Here it just calls a typed server function (searchFeed)
// directly. `next` is FeedItem[] with no annotation: the type crosses the wire
// through the import. No fetch, no API route, no query client, no cache to sync.
export function FeedSearch({ initial }: { initial: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [pending, startTransition] = useTransition();

  function onSearch(query: string) {
    startTransition(async () => {
      const next = await searchFeed(query);
      setItems(next);
    });
  }

  return (
    <div className="island">
      <input
        type="search"
        aria-label="Search the feed"
        placeholder="search the feed — e.g. 'auth', 'css', 'vite'"
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="log" data-pending={pending ? '' : undefined}>
        {items.map((item) => (
          <div className="row" key={item.id}>
            <time>{item.at}</time>
            <div>
              {item.title} <span className="src">· {item.source}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="note">no matches — try another term</p>}
      </div>
    </div>
  );
}
