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
| `/dashboard` | The honest frontier: where Better Auth would live, and why it isn't wired yet |

The UI colour-codes execution boundaries: cyan runs on the server, amber marks a `'use client'` island.

## Commands

```bash
pnpm dev                  # http://localhost:3000
pnpm build && pnpm start  # production build, served on PORT/HOST
pnpm typegen              # waku router typegen
```

pnpm here is npm migration debt (root `AGENTS.md` → Package Manager Standard): migrate the full package-manager contract before dependency-changing work.
