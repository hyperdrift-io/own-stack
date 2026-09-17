'use client';

import { useEffect } from 'react';
import { str } from '../lib/guard';
import { searchFeed } from '../queries';

// WebMCP, imperative: this island registers `search_feed` with the visitor's
// browser so their agent can search the feed. `execute` calls searchFeed — the
// same server function the search box calls — so page and agent cannot disagree.
// Feature-detected: without WebMCP the effect returns early and nothing changes.
// Aborting the controller on unmount unregisters the tool.
export function AgentTools() {
  useEffect(() => {
    const mc = document.modelContext;
    if (!mc) return;
    const off = new AbortController();
    mc.registerTool(
      {
        name: 'search_feed',
        description: 'Search the feed by title or source and read the matches.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Words to look for, max 80 characters' } },
        },
        execute: async (input: Record<string, unknown>) => ({
          items: await searchFeed(str(input.query, 80)),
        }),
      },
      { signal: off.signal },
    ).catch((err) => console.error('[webmcp]', err));
    return () => off.abort();
  }, []);
  return null;
}
