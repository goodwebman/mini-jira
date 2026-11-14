import { useEffect } from 'react';

import { bindQueryClientToasts, queryClient } from '@/app/query/queryClient';
import { useToast } from '@/shared/ui';

export function QueryNotifications() {
  const { toast } = useToast();
  useEffect(() => bindQueryClientToasts(queryClient, toast), [toast]);
  return null;
}
