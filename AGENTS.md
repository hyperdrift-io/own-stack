# own-stack

> **Inherits**: [Hyperdrift workspace AGENTS.md](../../../AGENTS.md) (`~/dev/hyperdrift/AGENTS.md`). Read it first; this file adds own-stack-specific context only.
>
> **Voice Covenant**: every user-facing surface, including demo copy, inherits `meta/PHILOSOPHY.md` #8 "Speak to Enable" — enable, never diminish; strengths first.

## Role

own-stack is the reference implementation of the HD UI Stack Standard (root `AGENTS.md` → UI Stack Standard): Waku as a thin React Server Components shell, guarded typed server functions, pure semantic CSS, owned passkeys (`@yannvr/auth`) as the designated auth layer, and WebMCP tools by default. Live demo: https://own-stack.hyperdrift.io (port 3010). The `own-your-stack-*` articles in `apps/hyper-drift/content/blog/` explain it.

Changes here change the pattern other apps copy. Keep every claim in `README.md` true of the code, and keep the stack small — the README promises five production dependencies, so add none without explicit approval.

## Routes

| Route | Demonstrates |
|-------|--------------|
| `/` | Static (SSG) page with one client island |
| `/feed` | Dynamic (SSR) page awaiting a typed server function — no API route. `<FeedArchive>` is slow on purpose behind `<Suspense>`, so streaming is visible |
| `/guestbook` | Typed server action (mutation); the form is the declarative WebMCP tool `sign_guestbook` |
| `/search` | Client island calling a server function directly; `agent-tools.tsx` registers the imperative WebMCP tool `search_feed` on the same function |
| `/layers` | Explains the agent-ready and network layers; `live-wire.tsx` listens to the SSE endpoint |
| `/api/events` | SSE handler at `src/pages/_api/api/events.ts`: `hello` on connect, `signed` per guestbook entry, `: beat` every 25s, torn down on abort. Listed in `sse_paths` in `infra/group_vars/apps.yml` |
| `/dashboard` | The honest frontier: where owned passkeys (`@yannvr/auth`) go. The page copy still names Better Auth and `createApi` — both superseded (2026-09-17): Waku serves handlers from `src/pages/_api/**` (folder `_api`, not `api`) and auth is owned, not vendored. Open task: port `@yannvr/auth` to `Request`/`Response`, wire it here, rewrite the copy (`patterns` skill, Pattern 1) |

The UI colour-codes execution boundaries: cyan runs on the server, amber marks a `'use client'` island. New surfaces carry that in `data-runtime="server|client"` and style from the attribute; the older pages still use a few classes (`.island`, `.stamp`, `.log`) — migrate the whole stylesheet in one pass, not piecemeal.

## Rules this reference sets

- **Every `'use server'` function guards first.** `searchFeed` and `signGuestbook` narrow and cap their input with `str(v, max)` from `src/lib/guard.ts` before anything reads it. A new server function does the same; no validation library.
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

## Gaps against the standard (2026-09-17)

The reference must show every layer it preaches. WebMCP, input guards, Suspense streaming and SSE are in. Still missing: auth (see `/dashboard` above), and the Better Auth mentions left in `src/lib/data.ts`, `src/pages/index.tsx` and `src/components/footer.tsx`. Close these, then delete this section.

## Version pin

`waku` is pinned to `1.0.0-rc.0` (2026-08-25), the release that froze the public API; bumped from `1.0.0-beta.4` on 2026-09-17 with no code changes. This app is the fleet's reference, so bump it here first, then every Waku app (`greenlife`, `stillness`, `together`, `wakejam`, `unanswered`). Move to `1.0.0` final when it ships. React stays on the 19.2 line: Waku's peer range is `~19.2.4`, so hold React 19.3 until that range moves. Verdicts: `meta/TOOLING.md`.
