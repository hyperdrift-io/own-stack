import { Link } from 'waku';
import { Counter } from '../components/counter';

// A server component, statically generated (render: 'static' below) — this whole
// page is HTML at build time. No client JS ships for it except the <Counter> island.
export default async function HomePage() {
  return (
    <div>
      <title>own-stack — a server-rendered React stack you own</title>
      <h1>Own your stack.</h1>
      <p className="muted">
        Server rendering (SSG · SSR · RSC), end-to-end types, and auth — assembled
        from small pieces you control, instead of one framework that owns you.
      </p>

      <section className="panel">
        <p><strong>The pieces</strong></p>
        <ul>
          <li><code>Waku</code> — a minimal React-Server-Components framework. SSG, SSR, file-based routing.</li>
          <li><code>RSC + server functions</code> — typed data fetching and mutations across the wire, no tRPC.</li>
          <li><code>Better Auth</code> — framework-agnostic auth that lives in your app, not a vendor.</li>
          <li><code>Pure CSS</code> — semantic stylesheet, no Tailwind, no CSS-in-JS.</li>
        </ul>
      </section>

      <h2>See it run</h2>
      <ul>
        <li><Link to="/feed">/feed</Link> — a dynamic (SSR) page fetching typed server data directly</li>
        <li><Link to="/guestbook">/guestbook</Link> — a typed server-action mutation, no API layer</li>
        <li><Link to="/dashboard">/dashboard</Link> — a route protected by Better Auth</li>
      </ul>

      <Counter />
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
