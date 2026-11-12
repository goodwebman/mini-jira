import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

import { queryClient } from '@/app/query/queryClient';
import { ErrorBlock } from '@/shared/ui/ErrorBlock/ErrorBlock';

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorBlock />}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
