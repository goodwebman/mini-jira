import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authService } from '@/entities/auth';
import { profileQueryKeys, updateProfile } from '@/entities/profile';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Новые имя и почта сразу видны везде: ответ кладётся и в кэш профиля,
 * и в сессию (меню, аватар). Имя участвует в досках и задачах — они устаревают.
 */
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    meta: { toast: false },
    onSuccess: (updated) => {
      client.setQueryData(profileQueryKeys.detail, updated);
      authService.patchUser(updated);
      void invalidateTags(client, [QUERY_TAGS.members, QUERY_TAGS.tasks]);
    },
  });
}
