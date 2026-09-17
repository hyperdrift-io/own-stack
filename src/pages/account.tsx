import { Link } from 'waku';
import { getAccount } from '../lib/account';
import { requireSession } from '../lib/session';

// A page nobody sees signed out. `requireSession()` runs first: without a
// session it redirects to /dashboard before anything streams.
export default async function AccountPage() {
  const session = await requireSession();
  const account = await getAccount(session.userId);

  return (
    <div>
      <title>Account — own-stack</title>

      <span className="stamp">render: dynamic · session required</span>

      <h1>All we hold about you.</h1>
      <p className="lede">
        A public key per device. No password, no email unless you choose to give
        one. If this database leaked tomorrow, nobody could sign in as you with
        what is in it.
      </p>

      <article data-runtime="server">
        <h3>Visitor {session.userId.slice(0, 8)}</h3>
        <p>First seen {account?.memberSince ?? 'today'}.</p>
        {(account?.keys ?? []).map((key, i) => (
          <p key={i}>
            Passkey {i + 1}: {key.device}, created {key.created}, last used {key.lastUsed}
          </p>
        ))}
      </article>

      <Link to="/dashboard" className="back">dashboard</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
