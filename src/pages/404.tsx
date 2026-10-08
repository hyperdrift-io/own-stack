import { Link } from 'waku';

export default function NotFoundPage() {
  return (
    <>
      <title>Nothing at this address — own-stack</title>
      <meta name="robots" content="noindex,follow" />
      <h1>Nothing at this address.</h1>
      <p className="lede">
        The page moved or never existed. The stack is small enough to read in one sitting, so the way back is short.
      </p>
      <p>
        <Link to="/">Back to the start</Link>
      </p>
    </>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
