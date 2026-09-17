'use client';

import { useRouter } from 'waku';
import { signGuestbook } from '../actions';

// A client component that calls the server action, then reloads the route so the
// server component re-renders with the new entry. The action is imported and
// called directly — fully typed, no fetch boilerplate.
//
// WebMCP, declarative: `toolname` and friends turn this same form into the
// `sign_guestbook` tool. The visitor's agent fills the fields; without
// `toolautosubmit`, the visitor still presses Sign.
export function GuestbookForm() {
  const router = useRouter();
  return (
    <div className="island">
      <form
        toolname="sign_guestbook"
        tooldescription="Leave a short public note in the guestbook."
        action={async (formData) => {
          await signGuestbook(formData);
          await router.reload();
        }}
      >
        <input
          name="name"
          placeholder="your name"
          required
          maxLength={40}
          toolparamdescription="Display name, max 40 characters"
        />
        <input
          name="message"
          placeholder="say something"
          required
          maxLength={140}
          toolparamdescription="The note, max 140 characters"
        />
        <button type="submit">Sign</button>
      </form>
    </div>
  );
}
