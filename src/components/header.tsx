import { Link } from 'waku';

// The legend establishes the whole visual language up front: cyan = server,
// amber = a client island. Every page is colour-coded by where its code runs.
export const Header = () => {
  return (
    <header>
      <Link to="/" className="wordmark">own-stack</Link>
      <div className="legend">
        <span className="is-server">server</span>
        <span className="is-client">client island</span>
      </div>
    </header>
  );
};
