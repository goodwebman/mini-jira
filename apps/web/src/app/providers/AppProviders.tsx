import { type ReactNode, useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

import { bindQueryClientToasts, queryClient } from '@/app/query/queryClient';
import { ErrorBlock } from '@/shared/ui/ErrorBlock/ErrorBlock';
import { UIToastProvider, useToast } from '@/shared/ui/UIToast';

function QueryNotifications() {
  const { toast } = useToast();
  useEffect(() => bindQueryClientToasts(queryClient, toast), [toast]);
  return null;
}

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorBlock />}>
      <UIToastProvider>
        <QueryClientProvider client={queryClient}>
          <QueryNotifications />
          {children}
        </QueryClientProvider>
      </UIToastProvider>
    </ErrorBoundary>
  );
}
