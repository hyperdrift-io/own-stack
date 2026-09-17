# own-stack

A server-rendered React stack you **own** — no Next.js. Assembled from small pieces you control, each one earning its place.

**🔗 Live demo: [own-stack.hyperdrift.io](https://own-stack.hyperdrift.io)** — try the feed, the typed search, and the guestbook, then add it to your phone's home screen and see how native it feels.

This is a minimal, runnable reference: every claim below is something this repo actually does.

## The stack

| Concern | Choice | Why |
|---|---|---|
| Rendering | **[Waku](https://waku.gg)** (React Server Components) | SSG · SSR · file-based routing, minimal surface. "Next without Next." |
| Data + mutations | **RSC + server functions** | Server Components `await` typed functions directly; server actions handle mutations. End-to-end types straight through the import — the function signature is the contract, database to button. |
| Styling | **Pure semantic CSS** | One stylesheet, style the primitives. No Tailwind, no CSS-in-JS. |
| Auth | **Owned passkeys** — [`@yannvr/auth`](https://hyperdrift.io/blog/passkeys-are-the-new-norm) *(designated layer)* | WebAuthn + an HttpOnly session cookie, in a package we own. See *Honest frontier* below. |

**Whole stack: 5 production dependencies.** The complete demo app is ~400 lines across 15 files.

## What it demonstrates

- `/` — a **static** (SSG) page; HTML at build time, with one small client island.
- `/feed` — a **dynamic** (SSR) page that awaits a typed server function directly. No API route, no client island.
- `/guestbook` — a **typed server action** (mutation). The function signature is the contract; no API route.
- `/search` — a **client island** that fetches typed data by calling a server function directly. The job people give TanStack Query / SWR — done with a plain import: types flow across the wire, and the server stays the single source of truth.
- `/dashboard` — the **honest frontier**: where owned passkey auth goes, and why it isn't wired yet.

The UI is colour-coded by execution boundary: **cyan** runs on the server, **amber** marks a `'use client'` island — the only JavaScript that ships. Pure semantic CSS, no Tailwind.

## Run it

```bash
npm install
npm run dev    # http://localhost:3000
npm run build && npm start
```

## Install it as an app

A manifest + a ~30-line service worker make it an installable PWA: on a phone,
**Add to Home Screen** launches it standalone — its own icon, no browser chrome.
Because the stack is server-rendered and light, the experience is hard to tell
from native. Verified installable (service worker active, manifest valid, zero
Chrome installability errors). No Workbox, no PWA plugin.

## Honest frontier: auth

Auth is the one layer this demo has not wired, and we would rather say so than fake a protected page. Two corrections to what we first wrote. The mount was never the blocker: Waku's file router serves raw `Request → Response` handlers from `src/pages/_api/**` (the folder is `_api`, not `api` — we probed the wrong one), so a `[...route].ts` exporting `GET`/`POST` answers `/api/auth/*`. And the right library is the one we already own: passkeys through [`@yannvr/auth`](https://hyperdrift.io/blog/passkeys-are-the-new-norm) (WebAuthn, HttpOnly session cookie), not a vendored auth layer. Its server half still speaks `next/server`; porting that core to plain `Request`/`Response` is the open task, and `/dashboard` stays honest until it lands.

---

Built by [Hyperdrift](https://hyperdrift.io). Doctrine: own your stack, keep only what earns its place, stay free to change it.
