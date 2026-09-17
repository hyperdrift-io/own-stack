import { auth } from '../../../../lib/auth';

// /api/auth/* — the passkey ceremony and sign-out, in one owned handler.
// `handleAuth` is plain Request → Response, so mounting it is these two lines:
// Waku serves anything under `src/pages/_api/` at the path that follows.
// Every route is a POST; GET is exported so a stray one gets a clean 405.
export const GET = (request: Request): Promise<Response> => auth.handleAuth(request);
export const POST = (request: Request): Promise<Response> => auth.handleAuth(request);
