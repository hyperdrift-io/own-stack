# own-stack

> **Inherits**: [Hyperdrift workspace AGENTS.md](../../../AGENTS.md) (`~/dev/hyperdrift/AGENTS.md`). Read it first; this file adds own-stack-specific context only.
>
> **Voice Covenant**: every user-facing surface, including demo copy, inherits `meta/PHILOSOPHY.md` #8 "Speak to Enable" — enable, never diminish; strengths first.

## Role

own-stack is the reference implementation of the HD UI Stack Standard (root `AGENTS.md` → UI Stack Standard): Waku as a thin React Server Components shell, guarded typed server functions, pure semantic CSS, owned passkeys (`@yannvr/auth`) as the designated auth layer, and WebMCP tools by default. Live demo: https://own-stack.hyperdrift.io (port 3010). The `own-your-stack-*` articles in `apps/hyper-drift/content/blog/` explain it.

Changes here change the pattern other apps copy. Keep every claim in `README.md` true of the code, and keep the stack small — the README counts nine production dependencies (five render, four run passkeys) and says what each is for, so add none without explicit approval.

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
| `/api/auth/*` | `@yannvr/auth`'s `handleAuth` at `src/pages/_api/api/auth/[...route].ts`: `passkey/register`, `passkey/verify-registration`, `passkey/authenticate`, `passkey/verify-authentication`, `sign-out` (all POST) |

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
npm run typegen                # waku router typegen
```

npm is the package manager (root `AGENTS.md` → Package Manager Standard): `package-lock.json` is the lockfile, and `infra/group_vars/apps.yml` deploys this app with `package_manager: "npm"`.

A pnpm or Yarn lockfile must never reappear here: every app scaffolded from this repo inherits its package manager.

## Auth

Owned passkeys through `@yannvr/auth` (source: `~/dev/hyperdrift/packages/auth`; walk-through: `patterns` skill, Pattern 1). No vendored or hosted auth, ever.

- `src/lib/auth.ts` configures it once. `ORIGIN` (default `http://localhost:3000`, production default `https://own-stack.hyperdrift.io`) fixes the WebAuthn origin and `rpID`; never derive them from a request. `JWT_SECRET` signs sessions; without it the process makes its own and a restart signs everyone out — fine for this demo, not for an app with users. `AUTH_DB` (default `.data/auth.db`, gitignored) is the SQLite file.
- Dev on another port needs the origin to match: `ORIGIN=http://localhost:3024 npm run dev -- --port 3024`.
- `src/lib/auth-store.ts` is an example adapter over `node:sqlite` (Node ≥ 22.13, prints an ExperimentalWarning on 22). A real app injects its own database client instead; the package never takes a database dependency.
- `src/lib/session.ts` is the only non-page file that imports `waku/*`. Everything else takes a `Headers` object.
- A server function cannot return a `Response`, so cookies it needs to set go through `queueCookie()` in `src/middleware/response-cookies.ts`.
- QA: the ceremony needs a browser. Drive Chrome with a CDP virtual authenticator (`WebAuthn.enable` + `WebAuthn.addVirtualAuthenticator`, `ctap2` / `internal` / resident key / user verified) through register, `/account`, sign-out, sign-in with the existing passkey.
- **Temporary:** `@yannvr/auth` resolves from `vendor/yannvr-auth-2.0.0.tgz` because 2.0.0 is not on npm yet (publishing needs the founder's npm login). Once it is published: `npm install @yannvr/auth@^2.0.0`, delete `vendor/`, delete this bullet. Do not copy the `vendor/` folder into a new app.

## Version pin

`waku` is pinned to `1.0.0-rc.0` (2026-08-25), the release that froze the public API; bumped from `1.0.0-beta.4` on 2026-09-17 with no code changes. This app is the fleet's reference, so bump it here first, then every Waku app (`greenlife`, `stillness`, `together`, `wakejam`, `unanswered`). Move to `1.0.0` final when it ships. React stays on the 19.2 line: Waku's peer range is `~19.2.4`, so hold React 19.3 until that range moves. Verdicts: `meta/TOOLING.md`.
