'use client';

import { useState } from 'react';

// A client component ("use client") — interactivity that hydrates in the browser,
// living next to the server components that render on the server. Same React.
export const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <section className="panel">
      <p>A client island: count is {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </section>
  );
};
