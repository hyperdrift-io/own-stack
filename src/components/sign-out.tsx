'use client';

import { useRouter } from 'waku';
import { signOut } from '../actions';

// Calls the server function, then reloads so the page renders signed out.
export function SignOut() {
  const router = useRouter();
  return (
    <form
      data-runtime="client"
      action={async () => {
        await signOut();
        await router.reload();
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );
}
