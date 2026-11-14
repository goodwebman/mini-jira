import { type ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { monitoring } from '@/app/monitoring';
import { queryClient } from '@/app/query/queryClient';
import { ErrorBlock } from '@/app/ui/ErrorBlock';
import { ErrorBoundary } from '@/shared/lib/react';
import { UIToastProvider } from '@/shared/ui';

import { QueryNotifications } from './QueryNotifications';

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ErrorBlock />}
      onError={(error, info) => {
        monitoring.captureException(error, {
          tags: { source: 'react' },
          contexts: { react: { componentStack: info.componentStack } },
        });
      }}
    >
      <UIToastProvider>
        <QueryClientProvider client={queryClient}>
          <QueryNotifications />
          {children}
        </QueryClientProvider>
      </UIToastProvider>
    </ErrorBoundary>
  );
}
