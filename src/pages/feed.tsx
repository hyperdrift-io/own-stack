import { Link } from 'waku';
import { getFeed } from '../lib/data';

// A server component rendered per request (render: 'dynamic' = SSR). It awaits a
// typed server function directly — `items` is FeedItem[] with zero glue between
// the data layer and the view. No client island ships for this page at all.
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

      <p className="note">
        no API route · no tRPC · no codegen — and zero client islands on this page
      </p>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
