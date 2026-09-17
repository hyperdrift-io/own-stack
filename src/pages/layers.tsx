import { Link } from 'waku';
import { LiveWire } from '../components/live-wire';

const FORM_SOURCE = `<form toolname="sign_guestbook"
      tooldescription="Leave a short public note in the guestbook.">
  <input name="name" maxlength="40"
         toolparamdescription="Display name, max 40 characters" />
  <input name="message" maxlength="140"
         toolparamdescription="The note, max 140 characters" />
  <button>Sign</button>
</form>`;

const TOOL_SOURCE = `document.modelContext?.registerTool({
  name: 'search_feed',
  execute: async (input) => ({ items: await searchFeed(str(input.query, 80)) }),
}, { signal })`;

// Static page. Two layers sit outside React — the visitor's agent above the
// page, nginx below it — and the stack owns both. Colour still says where code
// runs: `data-runtime` on the markup, no class.
export default async function LayersPage() {
  return (
    <div>
      <title>The outer layers — own-stack</title>

      <span className="stamp">render: static · ssg</span>

      <h1>The outer layers.</h1>
      <p className="lede">
        Two layers sit outside React, and we own them too. On top, your
        visitor&apos;s agent gets the same buttons your visitor has. Underneath,
        nginx decides how quickly each byte lands.
      </p>

      <section>
        <h2>Agent-ready: WebMCP</h2>
        <p>
          WebMCP is a W3C draft. A page tells the agent in the visitor&apos;s
          browser which actions it offers, as tools, and the agent stops guessing
          at selectors. Each tool here calls the function the button calls, so
          there is one behaviour to reason about.
        </p>

        <article data-runtime="server">
          <h3>Declarative · three attributes</h3>
          <p>
            The guestbook form names itself as a tool and describes its fields.
            That is the whole integration. The agent fills the form in; the
            visitor still presses Sign.
          </p>
          <pre><code>{FORM_SOURCE}</code></pre>
          <p><Link to="/guestbook">Sign it yourself on /guestbook</Link></p>
        </article>

        <article data-runtime="client">
          <h3>Imperative · one island</h3>
          <p>
            Search answers as you type, so there is no form to annotate. A small
            island registers <code>search_feed</code> instead. Its{' '}
            <code>execute</code> calls <code>searchFeed</code>, the same server
            function the search box calls. Browsers without WebMCP skip it, and
            leaving the page unregisters the tool.
          </p>
          <pre><code>{TOOL_SOURCE}</code></pre>
          <p><Link to="/search">Search the feed on /search</Link></p>
        </article>

        <p>
          An agent&apos;s input deserves the same care as anyone&apos;s. Both
          server functions narrow and cap what they receive on their first
          line: <code>str(value, max)</code>, one helper, no validation library.
        </p>
        <p className="note">
          see the tools: Chrome 149+, enable chrome://flags/#enable-webmcp-testing,
          then run await document.modelContext.getTools() in the console
        </p>
      </section>

      <section>
        <h2>The network layer: nginx</h2>
        <p>
          Waku renders, nginx delivers. Three lines in the deploy config shape
          what a visit feels like.
        </p>
        <dl>
          <dt><code>immutable_paths: [&quot;/assets/&quot;]</code></dt>
          <dd>
            Vite puts a content hash in every file name, so nginx tells the
            browser to keep those files for a year, <code>immutable</code>. A
            second visit downloads nothing it already has.
          </dd>
          <dt><code>streaming: true</code></dt>
          <dd>
            nginx passes each chunk on as it arrives. When one server component
            is slow, the rest of the page is already on screen.{' '}
            <Link to="/feed">Watch the archive arrive on /feed</Link>.
          </dd>
          <dt><code>sse_paths: [&quot;/api/events&quot;]</code></dt>
          <dd>
            That path stays open for an hour, unbuffered and uncompressed. The
            server sends a comment line every 25 seconds so no proxy in between
            hangs up on a quiet stream.
          </dd>
        </dl>

        <LiveWire />
      </section>

      <Link to="/" className="back">home</Link>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
