import { LogoutButton } from '@/features/auth/logout';
import { AsyncBoundary } from '@/shared/lib/react';
import { UIRequestError } from '@/shared/ui';
import {
  PersonalDataSkeleton,
  ProfileLayout,
  SecuritySkeleton,
  StatsSkeleton,
} from '@/widgets/profile-overview';

import { PersonalData } from './PersonalData';
import { Security } from './Security';
import { Stats } from './Stats';

export function ProfileScreen() {
  return (
    <ProfileLayout>
      <ProfileLayout.Main>
        <AsyncBoundary
          fallback={<PersonalDataSkeleton />}
          renderError={({ error, retry }) => (
            <UIRequestError error={error} retry={retry} />
          )}
        >
          <PersonalData />
        </AsyncBoundary>
        <AsyncBoundary
          fallback={<SecuritySkeleton />}
          renderError={({ error, retry }) => (
            <UIRequestError error={error} retry={retry} />
          )}
        >
          <Security />
        </AsyncBoundary>
      </ProfileLayout.Main>
      <ProfileLayout.Aside>
        <AsyncBoundary
          fallback={<StatsSkeleton />}
          renderError={({ error, retry }) => (
            <UIRequestError error={error} retry={retry} />
          )}
        >
          <Stats />
        </AsyncBoundary>
        <LogoutButton />
      </ProfileLayout.Aside>
    </ProfileLayout>
  );
}
