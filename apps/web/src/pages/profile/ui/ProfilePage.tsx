import { AsyncBoundary } from '@/shared/lib/react';
import { UIRequestError, UISkeleton } from '@/shared/ui';
import { ShellPage } from '@/widgets/app-shell';

import { ProfileScreen } from './ProfileScreen';

export function ProfilePage() {
  return (
    <ShellPage title='Профиль' caption='Личные данные и безопасность'>
      <AsyncBoundary
        fallback={<UISkeleton aria-label='Загрузка профиля' className='h-96' />}
        renderError={({ error, retry }) => (
          <UIRequestError error={error} retry={retry} />
        )}
      >
        <ProfileScreen />
      </AsyncBoundary>
    </ShellPage>
  );
}
