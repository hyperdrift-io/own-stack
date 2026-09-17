// What the island says when a passkey prompt doesn't end in a passkey. Browsers
// report a closed or timed-out prompt as one vague error; say what happened and
// what works next, in plain words.
export function passkeyMessage(error: string | null): string | null {
  if (!error) return null;
  if (/timed out|not allowed|abort/i.test(error)) {
    return 'The passkey prompt closed before it finished. Nothing was saved — press the button again when you like.';
  }
  if (/no passkey/i.test(error)) {
    return 'This browser has no passkey for own-stack yet. Create one and you are in.';
  }
  return error;
}
