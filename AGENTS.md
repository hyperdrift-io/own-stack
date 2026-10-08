# own-stack

> **Inherits**: [Hyperdrift workspace AGENTS.md](../../../AGENTS.md) (`~/dev/hyperdrift/AGENTS.md`). Read it first; this file adds own-stack-specific context only.
>
> **Voice Covenant**: every user-facing surface, including demo copy, inherits `meta/PHILOSOPHY.md` #8 "Speak to Enable" — enable, never diminish; strengths first.

## Role

own-stack is the reference implementation of the HD UI Stack Standard (root `AGENTS.md` → UI Stack Standard): Waku as a thin React Server Components shell, guarded typed server functions, pure semantic CSS, owned passkeys on the platform's own primitives (WebCrypto, no auth library), and WebMCP tools by default. Live demo: https://own-stack.hyperdrift.io (port 3010). The `own-your-stack-*` articles in `apps/hyper-drift/content/blog/` explain it.

Changes here change the pattern other apps copy. Keep every claim in `README.md` true of the code, and keep the stack small — the README counts five production dependencies, all for rendering, and says what each is for, so add none without explicit approval.

## Routes

| Route | Demonstrates |
|-------|--------------|
| `/` | Static (SSG) page with one client island |
| `/feed` | Dynamic (SSR) page awaiting a typed server function — no API route. `<FeedArchive>` is slow on purpose behind `<Suspense>`, so streaming is visible |
| `/guestbook` | Typed server action (mutation); the form is the declarative WebMCP tool `sign_guestbook` |
| `/search` | Client island calling a server function directly; `agent-tools.tsx` registers the imperative WebMCP tool `search_feed` on the same function |
| `/layers` | Explains the agent-ready and network layers; `live-wire.tsx` listens to the SSE endpoint |
| `/api/events` | SSE handler at `src/pages/_api/api/events.ts`: `hello` on connect, `signed` per guestbook entry, `: beat` every 25s, torn down on abort. Listed in `sse_paths` in `infra/group_vars/apps.yml` |
| `/dashboard` | Passkey sign-in. Dynamic: `getSession()` reads the cookie on the server before render; `passkey-sign-in.tsx` is the only island; `sign-out.tsx` calls the `signOut` server function |
| `/account` | Protected page: `requireSession()` redirects to `/dashboard` before anything streams. Shows what the store holds for the visitor |
| `/health` | Liveness probe at `src/pages/_api/health.ts`; `make check-launch-readiness` requires it |
| `/api/auth/*` | `auth.handleAuth` (`src/lib/auth.ts`) at `src/pages/_api/api/auth/[...route].ts`: `passkey/register`, `passkey/verify-registration`, `passkey/authenticate`, `passkey/verify-authentication`, `sign-out` (all POST) |

The UI colour-codes execution boundaries: cyan runs on the server, amber marks a `'use client'` island. New surfaces carry that in `data-runtime="server|client"` and style from the attribute; the older pages still use a few classes (`.island`, `.stamp`, `.log`) — migrate the whole stylesheet in one pass, not piecemeal.

## Rules this reference sets

- **Every `'use server'` function guards first.** `searchFeed` and `signGuestbook` narrow and cap their input with `str(v, max)` from `src/lib/guard.ts` before anything reads it; `signOut` takes no input and checks the session first. A new server function does the same; no validation library.
- **A WebMCP tool calls the function the button calls.** Declarative attributes are typed in `src/global.d.ts` (a module, which is why `*.css` lives in `src/css.d.ts`); the imperative API is typed in `types/webmcp.d.ts`. No runtime package.
- **SSE for push, `<Suspense>` for slow.** A new SSE path goes into `sse_paths` and needs `make nginx app=own-stack`.
- QA for these layers: `curl -N` on `/feed` and `/api/events`, and `await document.modelContext.getTools()` in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` (headless: `--enable-features=WebMCPTesting`).

## Commands

```bash
npm run dev                    # http://localhost:3000
npm run build && npm start     # production build, served on PORT/HOST
npm run type-check             # tsc --noEmit
npm test                       # passkey checks, node --test
npm run typegen                # waku router typegen
```

npm is the package manager (root `AGENTS.md` → Package Manager Standard): `package-lock.json` is the lockfile, and `infra/group_vars/apps.yml` deploys this app with `package_manager: "npm"`.

A pnpm or Yarn lockfile must never reappear here: every app scaffolded from this repo inherits its package manager.

## Auth

Owned passkeys with no auth library. The founder validated it on 2026-09-30 and it is the fleet pattern (`patterns` skill, Pattern 1).

- `src/lib/passkeys.ts` verifies both ceremonies with WebCrypto. The browser supplies the public key as SPKI through `credential.toJSON()`, so nothing decodes CBOR. Attestation is `none`. User verification is required. Change a check only together with its test in `src/lib/passkeys.test.ts`.
- `src/lib/auth.ts` holds the handler, `readSession` and `signOut`, and configures them once. `ORIGIN` (default `http://localhost:3000`, production default `https://own-stack.hyperdrift.io`) fixes the WebAuthn origin and `rpID`; never derive them from a request. `AUTH_DB` (default `.data/passkeys.db`, gitignored) is the SQLite file.
- Dev on another port needs the origin to match: `ORIGIN=http://localhost:3024 npm run dev -- --port 3024`.
- `src/lib/auth-store.ts` is the store over `node:sqlite` (Node ≥ 22.13). Sessions are random tokens; the table keeps their SHA-256. A challenge answers once and lives five minutes.
- Keys stored by the earlier package were in COSE form and sit in `.data/auth.db`. This code reads SPKI from a new file, so a visitor from before creates a passkey again. An app with real users converts its stored keys before it switches.
- `src/lib/session.ts` is the only non-page file that imports `waku/*`. Everything else takes a `Headers` object.
- A server function cannot return a `Response`, so cookies it needs to set go through `queueCookie()` in `src/middleware/response-cookies.ts`.
- QA: `npm test` for the checks; `node scripts/passkey-e2e.mjs http://localhost:3024` for the ceremony in a real Chrome with a virtual authenticator (register, `/account`, sign-out, sign-in, a browser with no passkey).

## Version pin

`waku` is pinned exactly to `1.0.0-rc.3` (2026-10-06), with React, react-dom and react-server-dom-webpack on `~19.3.0`, Waku's peer range since rc.1. Bumped from `1.0.0-rc.0` on 2026-10-08 with no code changes here. React 19.3 carries facebook/react#34760, which ends the 60-second blank page when a dynamic page throws not-found mid-stream under a layout that imports CSS. Since rc.2 the default root renders the `charset` and `viewport` meta tags, so an app with its own `src/pages/_root.tsx` adds both there. rc.3's `defineRouter` redesign touches only the programmatic router, not file routes. This app is the fleet's reference, so bump it here first, then every Waku app (`greenlife`, `stillness`, `together`, `wakejam`, `unanswered`). Keep the pin exact: `npm install` writes a caret, which would let the next rc in unreviewed. Move to `1.0.0` final when it ships. Verdicts: `meta/TOOLING.md`.
