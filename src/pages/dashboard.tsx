import { Link } from 'waku';
import { PasskeySignIn } from '../components/passkey-sign-in';
import { SignOut } from '../components/sign-out';
import { getSession } from '../lib/session';

const MOUNT_SOURCE = `// src/pages/_api/api/auth/[...route].ts
import { auth } from '../../../../lib/auth';
export const POST = (request: Request) => auth.handleAuth(request);`;

const SESSION_SOURCE = `// src/lib/session.ts
export const getSession = cache(() => auth.readSession(requestHeaders()));`;

// Dynamic page. The session is read on the server, from the request's cookie,
// before anything renders — so there is no signed-out flash and no auth state
// in the browser. Passkeys come from @yannvr/auth, the package we own.
export default async function DashboardPage() {
  const session = getSession();

  return (
    <div>
      <title>Dashboard — passkeys — own-stack</title>

      <span className="stamp">render: dynamic · session {session ? 'open' : 'none'}</span>

      {session ? (
        <>
          <h1>You&apos;re in.</h1>
          <p className="lede">
            The server checked your cookie before it rendered a byte of this
            page. No spinner, no auth state in the browser, no password anywhere.
          </p>

          <article data-runtime="server">
            <h3>What just happened</h3>
            <p>
              Your device signed a challenge with a private key that never left
              it. The server checked the signature against your public key and
              set an <code>HttpOnly</code> cookie, which scripts on this page
              cannot read. This component then asked <code>getSession()</code>{' '}
              who you are: visitor <code>{session.userId.slice(0, 8)}</code>.
            </p>
            <p>
              <Link to="/account">See everything the server holds about you</Link>. It
              is a short list.
            </p>
          </article>

          <SignOut />
        </>
      ) : (
        <>
          <h1>Sign in without a password.</h1>
          <p className="lede">
            Auth is the layer teams hand to a vendor first. Here it is one
            package we own, mounted in two lines, with no password table to
            leak.
          </p>

          <PasskeySignIn />
        </>
      )}

      <section>
        <h2>How it is wired</h2>
        <article data-runtime="server">
          <h3>One handler, two lines</h3>
          <p>
            <code>@yannvr/auth</code> speaks plain <code>Request → Response</code>,
            so Waku mounts it like any other file under <code>src/pages/_api/</code>.
            Storage is injected: this demo hands it a SQLite file through{' '}
            <code>node:sqlite</code>, which ships inside Node.
          </p>
          <pre><code>{MOUNT_SOURCE}</code></pre>
        </article>
        <article data-runtime="server">
          <h3>One session read per request</h3>
          <p>
            React&apos;s <code>cache()</code> verifies the cookie once, however
            many components ask. Sign-out is a server function with the same
            guard as every other one: no session, nothing to do.
          </p>
          <pre><code>{SESSION_SOURCE}</code></pre>
        </article>
      </section>

      <p className="note">
        this page used to say auth was not wired. we had probed the wrong folder,
        then ported our own passkey package off Next.js. the account you make
        here is a throwaway: no email asked, nothing worth stealing
      </p>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
