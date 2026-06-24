import { Link } from 'waku';
import { getEntries } from '../lib/guestbook';
import { GuestbookForm } from '../components/guestbook-form';

// Server component (SSR). Reads the typed store directly, renders the form
// (the page's single client island) for the mutation.
export default async function GuestbookPage() {
  const entries = await getEntries();

  return (
    <div>
      <title>Guestbook — own-stack</title>

      <span className="stamp">render: dynamic · ssr</span>

      <h1>Guestbook</h1>
      <p className="lede">
        The form calls a typed server action. The function signature is the
        contract — no API route, no tRPC.
      </p>

      <GuestbookForm />

      <p className="note client">
        the form above is the only JavaScript on this page — everything below is
        server-rendered
      </p>

      <div className="entries">
        {entries.map((e, i) => (
          <div className="entry" key={i}>
            <div className="who">
              {e.name} <time>{e.at}</time>
            </div>
            <p className="msg">{e.message}</p>
          </div>
        ))}
      </div>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
