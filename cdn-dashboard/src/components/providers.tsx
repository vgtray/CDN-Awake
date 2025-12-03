'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { NotificationToast } from './notifications';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1, // Only retry once to avoid rate limiting
            retryDelay: 1000, // Wait 1 second before retry
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <NotificationToast />
    </QueryClientProvider>
  );
}
