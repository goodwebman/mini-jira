import { useMutation } from '@tanstack/react-query';

import { changePassword } from '@/entities/profile';

/** Сервер оставляет текущую сессию и закрывает остальные: кэш трогать не нужно. */
export function useChangePassword() {
  return useMutation({ mutationFn: changePassword, meta: { toast: false } });
}
