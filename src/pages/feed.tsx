import { Link } from 'waku';
import { getFeed } from '../lib/data';

// A server component rendered per request (render: 'dynamic' = SSR). It awaits a
// typed server function directly — `items` is FeedItem[] with zero glue between
// the data layer and the view. No client JS ships for this page at all.
export default async function FeedPage() {
  const items = await getFeed();

  return (
    <div>
      <title>Feed — own-stack</title>
      <h1>Feed</h1>
      <p className="muted">
        Server-rendered on every request. The data came from a typed server
        function the component <code>await</code>ed — no API route, no tRPC.
      </p>

      <section className="panel">
        {items.map((item) => (
          <p key={item.id}>
            <span className="tag">{item.at}</span>
            {item.title} <span className="muted">· {item.source}</span>
          </p>
        ))}
      </section>

      <p><Link to="/">← home</Link></p>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
