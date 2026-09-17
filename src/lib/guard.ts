// Every 'use server' function is a public HTTP endpoint. Its signature types the
// caller we wrote; anyone else — a script, an agent — can post anything. So each
// one narrows and caps its input on the first line. Not a string? Empty. Too
// long? Cut. A validation library earns its place only when shapes get deep.
export const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
