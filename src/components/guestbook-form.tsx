'use client';

import { useRouter } from 'waku';
import { signGuestbook } from '../actions';

// A client component that calls the server action, then reloads the route so the
// server component re-renders with the new entry. The action is imported and
// called directly — fully typed, no fetch boilerplate.
export function GuestbookForm() {
  const router = useRouter();
  return (
    <div className="island">
      <form
        action={async (formData) => {
          await signGuestbook(formData);
          await router.reload();
        }}
      >
        <input name="name" placeholder="your name" required />
        <input name="message" placeholder="say something" required />
        <button type="submit">Sign</button>
      </form>
    </div>
  );
}
