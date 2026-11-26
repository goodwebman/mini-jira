import { useStore } from '@/shared/lib/store';

import { authService } from './auth-instance';

export function useAuth() {
  return useStore(authService);
}
