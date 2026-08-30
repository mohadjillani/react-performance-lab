'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

/**
 * One QueryClient per browser tab. staleTime matches the pages' ISR window:
 * anything the server rendered or the client prefetched is trusted for a
 * minute, so navigating catalogue -> detail -> back never refetches.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
