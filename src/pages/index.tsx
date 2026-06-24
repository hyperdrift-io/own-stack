import { Link } from 'waku';
import { Counter } from '../components/counter';
import { InstallApp } from '../components/install-app';

// A server component, statically generated (render: 'static' below) — this whole
// page is HTML at build time. The only JavaScript that ships is the <Counter> island.
export default async function HomePage() {
  return (
    <div>
      <title>own-stack — a server-rendered React stack you own</title>

      <span className="stamp">render: static · ssg</span>

      <h1>Own your stack.</h1>
      <p className="lede">
        Server rendering, end-to-end types, and auth — assembled from small
        pieces you control, instead of one framework that owns you.
      </p>

      <div className="figures">
        <div className="figure"><b>5</b><span>production deps</span></div>
        <div className="figure"><b>~400</b><span>lines of code</span></div>
        <div className="figure"><b>0</b><span>API routes · tRPC · codegen</span></div>
        <div className="figure"><b>1</b><span>framework, and it gets out of the way</span></div>
      </div>

      <h2>How a request flows</h2>
      <div className="schematic">
        <div className="pipeline">
          <div className="node"><b>Request</b><span>browser</span></div>
          <div className="node"><b>Waku</b><span>ssg · ssr · routing</span></div>
          <div className="node"><b>Server Components</b><span>run on server</span></div>
          <div className="node"><b>Server functions</b><span>data + mutations</span></div>
          <div className="node terminus"><b>HTML</b><span>typed, server-shaped</span></div>
        </div>
        <div className="branch">'use client' islands hydrate only the interactive bits</div>
      </div>

      <h2>The pieces</h2>
      <ul className="pieces">
        <li>
          <b>Waku</b>
          <p>A minimal React-Server-Components framework. SSG, SSR, file-based routing — then it steps aside.</p>
        </li>
        <li>
          <b>RSC + actions</b>
          <p>Typed data fetching and mutations across the wire. The import is the contract — no tRPC.</p>
        </li>
        <li>
          <b>Better Auth</b>
          <p>Framework-agnostic auth that lives inside your app, not behind a vendor.</p>
        </li>
        <li>
          <b>Pure CSS</b>
          <p>One semantic stylesheet. No Tailwind, no CSS-in-JS, no utility soup.</p>
        </li>
      </ul>

      <h2>See it run</h2>
      <div className="routes">
        <Link to="/feed" className="route-card" data-runtime="server">
          <span className="path">/feed</span>
          <span className="desc">Typed server data, fetched directly in a server component.</span>
          <span className="runtime">SSR · 0 islands</span>
        </Link>
        <Link to="/guestbook" className="route-card" data-runtime="client">
          <span className="path">/guestbook</span>
          <span className="desc">A typed server-action mutation. One small client island.</span>
          <span className="runtime">SSR · 1 island</span>
        </Link>
        <Link to="/search" className="route-card" data-runtime="client">
          <span className="path">/search</span>
          <span className="desc">A client island fetching typed data via a server function — no tRPC, no TanStack.</span>
          <span className="runtime">client fetch</span>
        </Link>
        <Link to="/dashboard" className="route-card" data-runtime="frontier">
          <span className="path">/dashboard</span>
          <span className="desc">Where Better Auth wants to live — the honest frontier.</span>
          <span className="runtime">frontier</span>
        </Link>
      </div>

      <Counter />

      <h2>Make it an app</h2>
      <p className="muted">
        Server-rendered and fast, it installs to a phone&apos;s home screen and runs
        standalone — the same code, indistinguishable from native.
      </p>
      <InstallApp />
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
