import { Suspense } from 'react';
import { Link } from 'waku';
import { FeedArchive } from '../components/feed-archive';
import { getFeed } from '../lib/data';

// A server component rendered per request (render: 'dynamic' = SSR). It awaits a
// typed server function directly — `items` is FeedItem[] with zero glue between
// the data layer and the view. No client island ships for this page at all.
//
// The archive below it is slow on purpose. Behind a <Suspense> boundary it
// streams in when it is ready, in the same HTML response — still no client code.
export default async function FeedPage() {
  const items = await getFeed();

  return (
    <div>
      <title>Feed — own-stack</title>

      <span className="stamp">render: dynamic · ssr</span>

      <h1>Feed</h1>
      <p className="lede">
        Server-rendered on every request. The data came straight from a typed
        server function the component <code>await</code>ed.
      </p>

      <div className="log">
        {items.map((item) => (
          <div className="row" key={item.id}>
            <time>{item.at}</time>
            <div>
              {item.title} <span className="src">· {item.source}</span>
            </div>
          </div>
        ))}
      </div>

      <h2>From the archive</h2>
      <p className="muted">
        This part waits two seconds on a pretend upstream. Everything above was
        on your screen before it answered.
      </p>
      <Suspense fallback={<p role="status">the archive is on its way…</p>}>
        <FeedArchive />
      </Suspense>

      <p className="note">
        no API route · no tRPC · no codegen — one HTML response, streamed, and
        zero client islands on this page
      </p>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
