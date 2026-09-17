// GET /health — the liveness probe `make check-launch-readiness` asks every
// non-SEO app for. It answers from the running process and touches nothing else.
export const GET = (): Response => Response.json({ ok: true });
