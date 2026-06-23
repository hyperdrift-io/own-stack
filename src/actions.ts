'use server';

import { addEntry } from './lib/guestbook';

// A server action. The client calls it like a local async function; React ships
// the call across the wire. Types are enforced on both ends from this one
// signature — no API schema, no tRPC router, no codegen.
export async function signGuestbook(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim().slice(0, 40);
  const message = String(formData.get('message') ?? '').trim().slice(0, 140);
  if (name && message) {
    await addEntry(name, message);
  }
}
