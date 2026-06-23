# own-stack

A server-rendered React stack you **own** — no Next.js. Assembled from small pieces you control instead of one framework that owns you.

This is a minimal, runnable reference: every claim below is something this repo actually does.

## The stack

| Concern | Choice | Why |
|---|---|---|
| Rendering | **[Waku](https://waku.gg)** (React Server Components) | SSG · SSR · file-based routing, minimal surface. "Next without Next." |
| Data + mutations | **RSC + server functions** | Server Components `await` typed functions directly; server actions handle mutations. End-to-end types with **no tRPC, no API schema, no codegen**. |
| Styling | **Pure semantic CSS** | One stylesheet, style the primitives. No Tailwind, no CSS-in-JS. |
| Auth | **[Better Auth](https://better-auth.com)** *(designated layer)* | Framework-agnostic, lives in your app. See *Honest frontier* below. |

**Whole stack: 5 production dependencies.** The complete demo app is ~400 lines across 15 files.

## What it demonstrates

- `/` — a **static** (SSG) page; HTML at build time, one small client island.
- `/feed` — a **dynamic** (SSR) page that awaits a typed server function directly. Ships **zero client-side JavaScript**.
- `/guestbook` — a **typed server action** (mutation). The function signature is the contract; no API route.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm start
```

## Honest frontier: auth

Better Auth is framework-agnostic and clean. The friction today is **Waku-beta's API ergonomics**: mounting an arbitrary request handler doesn't work via a file convention — it needs Waku's programmatic `createApi`. So in this young framework, the API/auth layer is where you still wire the plumbing yourself, unlike Next where auth is a documented drop-in. That gap is the price of owning the stack while the RSC ecosystem is still young — and it's closing fast.

---

Built by [Hyperdrift](https://hyperdrift.io). Doctrine: own your stack, prefer subtraction, no lock-in.
