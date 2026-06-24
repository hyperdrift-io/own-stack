import { Link } from 'waku';
import { getFeed } from '../lib/data';
import { FeedSearch } from '../components/feed-search';

// SSR page that renders an initial server-fetched list, then hands off to a
// client island that fetches more by calling a typed server function directly.
export default async function SearchPage() {
  const initial = await getFeed();

  return (
    <div>
      <title>Typed search — own-stack</title>

      <span className="stamp">render: dynamic · ssr + client fetch</span>

      <h1>Typed search.</h1>
      <p className="lede">
        The input is a client island. As you type it calls a typed server
        function directly — no API route, no tRPC, no TanStack Query. The
        function&apos;s return type is the client&apos;s data type.
      </p>

      <FeedSearch initial={initial} />

      <p className="note client">
        client-initiated fetch · server-owned data · types shared by import
      </p>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
