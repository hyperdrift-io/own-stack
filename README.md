# own-stack

A server-rendered React stack you **own** — no Next.js. Assembled from small pieces you control, each one earning its place.

**🔗 Live demo: [own-stack.hyperdrift.io](https://own-stack.hyperdrift.io)** — try the feed, the typed search, and the guestbook, point your browser's agent at it, then add it to your phone's home screen and see how native it feels.

This is a minimal, runnable reference: every claim below is something this repo actually does.

## The stack

| Concern | Choice | Why |
|---|---|---|
| Rendering | **[Waku](https://waku.gg)** (React Server Components) | SSG · SSR · file-based routing, minimal surface. "Next without Next." |
| Network | **nginx** | Part of the stack, not a doorman in front of it: content-hashed `/assets/` cached for a year as `immutable`, HTML passed on unbuffered so Suspense chunks land as they flush, SSE paths left open and uncompressed. Three keys in the deploy config. |
| Data + mutations | **RSC + server functions** | Server Components `await` typed functions directly; server actions handle mutations. End-to-end types straight through the import — the function signature is the contract, database to button. Every `'use server'` function is a public endpoint, so each one narrows and caps its input on the first line (`str(v, max)` in `src/lib/guard.ts`, no validation library). |
| Push | **SSE + `<Suspense>`** | Slow data streams inside the same HTML response. Live data is Server-Sent Events from a raw handler under `src/pages/_api/`, with a heartbeat every 25s and cleanup on abort. No WebSocket server, no client cache. |
| Agents | **[WebMCP](https://webmachinelearning.github.io/webmcp/)** | The page offers its own actions to the visitor's agent as tools: three attributes on a form, or one small island calling `document.modelContext.registerTool`. A tool calls the function the button calls. Feature-detected; typed locally in `types/webmcp.d.ts`, no package. |
| Styling | **Pure semantic CSS** | One stylesheet, style the primitives. No Tailwind, no CSS-in-JS. |
| Auth | **Owned passkeys**, on the platform | WebAuthn checked with WebCrypto, plus an HttpOnly session cookie. No auth library, no password table, no auth vendor. See *Auth: passkeys we own* below. |

**Whole stack: 5 production dependencies.** All five render the pages (Waku, Hono, React ×3). Passkeys run on what the browser and Node already ship. The database for the demo is the SQLite inside Node. The complete app is ~1,850 lines of TypeScript across 42 files, plus one stylesheet and one test file.

## What it demonstrates

- `/` — a **static** (SSG) page; HTML at build time, with one small client island.
- `/feed` — a **dynamic** (SSR) page that awaits a typed server function directly. No API route, no client island. A deliberately slow server component sits behind `<Suspense>`: the page arrives first, the archive streams in two seconds later, in one HTML response (`curl -N` shows the chunks).
- `/guestbook` — a **typed server action** (mutation). The function signature is the contract; no API route. The form is also the `sign_guestbook` WebMCP tool, declared with `toolname`, `tooldescription` and `toolparamdescription` — the agent fills it in, the visitor still presses Sign.
- `/search` — a **client island** that fetches typed data by calling a server function directly. The job people give TanStack Query / SWR — done with a plain import: types flow across the wire, and the server stays the single source of truth. One more island (`src/components/agent-tools.tsx`) registers `search_feed` for the visitor's agent; its `execute` calls the same `searchFeed`.
- `/layers` — the **outer layers** explained: WebMCP above the page, nginx below it, and a live island listening to `/api/events` (SSE). Sign the guestbook in another tab and the note lands there without a reload.
- `/dashboard` — **passkey sign-in**. The session is read on the server before the page renders; the island only runs the ceremony.
- `/account` — a **protected page**: `requireSession()` redirects before anything streams. It lists everything the server holds about you, which is a public key.

The UI is colour-coded by execution boundary: **cyan** runs on the server, **amber** marks a `'use client'` island — the only JavaScript that ships. Pure semantic CSS, no Tailwind.

## Run it

```bash
npm install
npm run dev    # http://localhost:3000
npm run build && npm start
```

## Check the outer layers

```bash
curl -N http://localhost:8080/feed          # the archive arrives ~2s after the rest
curl -N http://localhost:8080/api/events    # `event: hello`, then a `: beat` comment every 25s
```

WebMCP needs Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. Then, in the console:

```js
await document.modelContext.getTools() // search_feed on /search, sign_guestbook on /guestbook
```

In production the app's entry in `infra/group_vars/apps.yml` sets `immutable_paths: ["/assets/"]`, `streaming: true` and `sse_paths: ["/api/events"]`; `curl -sI https://own-stack.hyperdrift.io/assets/<file>` answers `Cache-Control: public, max-age=31536000, immutable`.

## Install it as an app

A manifest + a ~30-line service worker make it an installable PWA: on a phone,
**Add to Home Screen** launches it standalone — its own icon, no browser chrome.
Because the stack is server-rendered and light, the experience is hard to tell
from native. Verified installable (service worker active, manifest valid, zero
Chrome installability errors). No Workbox, no PWA plugin.

## Auth: passkeys we own

The first version of this page said auth was the one layer we had not wired. Two things were wrong with our own excuse, and fixing them was the work.

**The mount was never missing.** Waku serves raw `Request → Response` handlers from `src/pages/_api/**`. The folder is `_api`, not `api`; we had probed the wrong one and blamed the framework.

**The library was never needed.** We first ran passkeys through a package of ours that wrapped three libraries. The platform has since caught up. The browser turns the server's JSON into a passkey request and its answer back into JSON (`PublicKeyCredential.parseCreationOptionsFromJSON`, `credential.toJSON()`), and it hands over the public key in a form WebCrypto imports directly. So the server decodes no CBOR and needs no protocol library. It mounts in two lines:

```ts
// src/pages/_api/api/auth/[...route].ts
import { auth } from '../../../../lib/auth';
export const POST = (request: Request) => auth.handleAuth(request);
```

What to read, in order:

- `src/lib/passkeys.ts` — the checks, in one file: the answer was made for this challenge, on this origin, for this site, by a person who was present and verified, and the signature matches the stored key. ES256, Ed25519 and RS256.
- `src/lib/passkeys.test.ts` — a software authenticator signs real answers, then every check is broken one at a time. `npm test`.
- `src/lib/auth.ts` — the handler and the one place auth is configured. The origin is fixed in config, never read from a request.
- `src/lib/auth-store.ts` — four tables over `node:sqlite`, which ships inside Node. Swap in your own database without touching a caller.
- `src/lib/session.ts` — `getSession()` reads the session once per request with React's `cache()`; `requireSession()` redirects before anything streams. `/account` uses it.
- `src/lib/passkey-client.ts` and `src/components/passkey-sign-in.tsx` — the browser's half and the island. The island never sees the cookie.
- `src/actions.ts` → `signOut()` — a server function returns data, not a `Response`, so `src/middleware/response-cookies.ts` (20 lines) carries its `Set-Cookie` out.
- `scripts/passkey-e2e.mjs` — the whole ceremony in a real Chrome with its virtual authenticator.

What this costs, plainly: about 640 lines of auth code that are ours to keep right, where a library used to carry that weight. The tests are the counterweight. Registration asks for no attestation, so the server never learns the make of your device. The session cookie holds a random token and the database holds only its hash: sign-out ends the session at once, and a leaked database signs nobody in. It needs a browser from 2025 or later; an older one sees the buttons disabled.

Try it on the [live demo](https://own-stack.hyperdrift.io/dashboard): no email, no form. The account you create is a throwaway.

---

Built by [Hyperdrift](https://hyperdrift.io). Doctrine: own your stack, keep only what earns its place, stay free to change it.
