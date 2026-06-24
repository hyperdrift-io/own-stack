import { Link } from 'waku';

// The honest frontier. Better Auth is exactly the right shape for a stack you
// own — but mounting an arbitrary request handler in Waku today needs its
// programmatic `createApi`, not the obvious file convention. We say so plainly
// instead of shipping a fake "protected" page.
export default async function DashboardPage() {
  return (
    <div>
      <title>Dashboard — the frontier — own-stack</title>

      <span className="stamp">render: static · frontier</span>

      <h1>The frontier.</h1>
      <p className="lede">
        This is where auth would live — and where owning your stack meets a young
        ecosystem honestly.
      </p>

      <div className="frontier">
        <h3>Not yet wired</h3>
        <p>
          We wanted <a href="https://better-auth.com" target="_blank" rel="noreferrer">Better Auth</a>{' '}
          here: framework-agnostic, TypeScript-native, living inside the app
          rather than behind a vendor. The right shape.
        </p>
        <p>
          But mounting an arbitrary <code>Request → Response</code> handler in
          Waku today doesn&apos;t work through the obvious file convention — we
          probed it and got a clean <code>404</code>. It needs Waku&apos;s
          programmatic <code>createApi</code>. The RSC core is mature; the API
          ergonomics are the edge.
        </p>
      </div>

      <p className="note">
        owning your stack means meeting the edges of a framework that&apos;s young
        precisely because it&apos;s minimal — and knowing exactly where they are
      </p>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
