import { Link } from 'waku';
import { getEntries } from '../lib/guestbook';
import { GuestbookForm } from '../components/guestbook-form';

// Server component (SSR). Reads the typed store directly, renders the form
// (a small client island) for the mutation.
export default async function GuestbookPage() {
  const entries = await getEntries();

  return (
    <div>
      <title>Guestbook — own-stack</title>
      <h1>Guestbook</h1>
      <p className="muted">
        The form calls a typed server action. No API route, no tRPC — the function
        signature is the contract.
      </p>

      <GuestbookForm />

      <section className="panel">
        {entries.map((e, i) => (
          <p key={i}>
            <strong>{e.name}</strong> <span className="muted">· {e.at}</span>
            <br />
            {e.message}
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
