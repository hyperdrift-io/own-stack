import { getArchive } from '../lib/data';

// A deliberately slow server component. /feed wraps it in <Suspense>, so the
// page above it is already on screen while this one waits on its upstream.
export async function FeedArchive() {
  const items = await getArchive();
  return (
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
  );
}
