'use server';

import { str } from './lib/guard';
import { addEntry } from './lib/guestbook';

// A server action. The client calls it like a local async function; React ships
// the call across the wire. Types are enforced on both ends from this one
// signature — no API schema, no tRPC router, no codegen.
//
// The same function serves the Sign button and the `sign_guestbook` WebMCP tool,
// so a person and their agent can never disagree about what signing does. The
// guard comes first: types are gone by the time a request lands here.
export async function signGuestbook(formData: FormData): Promise<void> {
  if (!(formData instanceof FormData)) return;
  const name = str(formData.get('name'), 40);
  const message = str(formData.get('message'), 140);
  if (name && message) {
    await addEntry(name, message);
  }
}
