import { AsyncBoundary } from '@/shared/lib/react';
import { UIRequestError } from '@/shared/ui';
import { ShellPage } from '@/widgets/app-shell';
import { ProfileSkeleton } from '@/widgets/profile-overview';

import { ProfileScreen } from './ProfileScreen';

export function ProfilePage() {
  return (
    <ShellPage title='Профиль' caption='Личные данные и безопасность'>
      <AsyncBoundary
        fallback={<ProfileSkeleton />}
        renderError={({ error, retry }) => (
          <UIRequestError error={error} retry={retry} />
        )}
      >
        <ProfileScreen />
      </AsyncBoundary>
    </ShellPage>
  );
}
