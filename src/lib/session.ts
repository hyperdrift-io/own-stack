import { cache } from 'react';
import { unstable_getHeaders, unstable_redirect } from 'waku/router/server';
import { auth } from './auth';

// Server only. The one file that asks Waku for the request, so the rest of the
// app depends on a `Headers` object and nothing else.
export const requestHeaders = (): Headers => new Headers(unstable_getHeaders());

// `cache()` makes this one verification per request, however many components
// ask who is signed in.
export const getSession = cache(() => auth.readSession(requestHeaders()));

// For a page nobody should see signed out. Call it first thing in the page's
// server component: a redirect has to happen before anything streams.
export async function requireSession() {
  const session = getSession();
  if (!session) unstable_redirect('/dashboard');
  return session;
}
