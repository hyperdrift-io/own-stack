# own-stack

> **Inherits**: [Hyperdrift workspace AGENTS.md](../../../AGENTS.md) (`~/dev/hyperdrift/AGENTS.md`). Read it first; this file adds own-stack-specific context only.
>
> **Voice Covenant**: every user-facing surface, including demo copy, inherits `meta/PHILOSOPHY.md` #8 "Speak to Enable" — enable, never diminish; strengths first.

## Role

own-stack is the reference implementation of the HD UI Stack Standard (root `AGENTS.md` → UI Stack Standard): Waku React Server Components, typed server functions, pure semantic CSS, and Better Auth as the designated auth layer. Live demo: https://own-stack.hyperdrift.io (port 3010). The `own-your-stack-*` articles in `apps/hyper-drift/content/blog/` explain it.

Changes here change the pattern other apps copy. Keep every claim in `README.md` true of the code, and keep the stack small — the README promises five production dependencies, so add none without explicit approval.

## Routes

| Route | Demonstrates |
|-------|--------------|
| `/` | Static (SSG) page with one client island |
| `/feed` | Dynamic (SSR) page awaiting a typed server function — no API route |
| `/guestbook` | Typed server action (mutation) |
| `/search` | Client island calling a server function directly |
| `/dashboard` | The honest frontier: where Better Auth goes. Its copy is wrong about needing `createApi`: Waku's file router serves handlers from `src/pages/_api/**` (folder `_api`, not `api`) and Better Auth's Waku guide uses exactly that — wiring auth here is the open task; rewrite the page copy when it lands (`patterns` skill, Pattern 1a) |

The UI colour-codes execution boundaries: cyan runs on the server, amber marks a `'use client'` island.

## Commands

```bash
npm run dev                    # http://localhost:3000
npm run build && npm start     # production build, served on PORT/HOST
npm run type-check             # tsc --noEmit
npm run typegen                # waku router typegen
```

npm is the package manager (root `AGENTS.md` → Package Manager Standard): `package-lock.json` is the lockfile, and `infra/group_vars/apps.yml` deploys this app with `package_manager: "npm"`.

## Version pin

`waku` is pinned to `1.0.0-rc.0` (2026-08-25), the release that froze the public API; bumped from `1.0.0-beta.4` on 2026-09-17 with no code changes. This app is the fleet's reference, so bump it here first, then every Waku app (`greenlife`, `stillness`, `together`, `wakejam`, `unanswered`). Move to `1.0.0` final when it ships. React stays on the 19.2 line: Waku's peer range is `~19.2.4`, so hold React 19.3 until that range moves. Verdicts: `meta/TOOLING.md`.
