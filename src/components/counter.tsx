'use client';

import { useState } from 'react';

// A client island — interactivity that hydrates in the browser, living right
// next to the server components that render on the server. Same React, marked
// amber so you can see exactly where (and how little) JavaScript ships.
export const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="island">
      <p>This counter is the only interactive JavaScript on the home page.</p>
      <p>Count is <span className="count">{count}</span></p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
};
