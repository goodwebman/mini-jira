import { UISkeleton } from '@/shared/ui';

import { PersonalDataSkeleton } from './PersonalDataSkeleton';
import { ProfileLayout } from './ProfileLayout';
import { SecuritySkeleton } from './SecuritySkeleton';
import { StatsSkeleton } from './StatsSkeleton';

export function ProfileSkeleton() {
  return (
    <ProfileLayout>
      <ProfileLayout.Main>
        <PersonalDataSkeleton />
        <SecuritySkeleton />
      </ProfileLayout.Main>
      <ProfileLayout.Aside>
        <StatsSkeleton />
        <UISkeleton className='h-control w-full' />
      </ProfileLayout.Aside>
    </ProfileLayout>
  );
}
