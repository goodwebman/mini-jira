import type { ReactNode } from 'react';

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { UIToastProvider } from '@/shared/ui/UIToast';

export function TestProviders({
  client,
  children,
}: {
  readonly client: QueryClient;
  readonly children: ReactNode;
}) {
  return (
    <UIToastProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </UIToastProvider>
  );
}
