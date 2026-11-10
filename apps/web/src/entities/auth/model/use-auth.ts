import { useSyncExternalStore } from 'react';
import { authService } from './auth-instance';

export function useAuth() {
  return useSyncExternalStore(authService.subscribe, authService.getSnapshot);
}
