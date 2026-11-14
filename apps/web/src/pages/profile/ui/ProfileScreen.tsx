import { useSuspenseQueries } from '@tanstack/react-query';

import {
  myTaskStatsQueryOptions,
  profileQueryOptions,
} from '@/entities/profile';
import { LogoutButton } from '@/features/auth/logout';
import {
  PersonalDataCard,
  ProfileLayout,
  RecentTasksCard,
  SecurityCard,
  TaskStatsCard,
} from '@/widgets/profile-overview';

export function ProfileScreen() {
  const [{ data: me }, { data: stats }] = useSuspenseQueries({
    queries: [profileQueryOptions, myTaskStatsQueryOptions],
  });

  return (
    <ProfileLayout>
      <ProfileLayout.Main>
        <PersonalDataCard me={me} />
        <SecurityCard hasPassword={me.hasPassword} />
      </ProfileLayout.Main>
      <ProfileLayout.Aside>
        <TaskStatsCard stats={stats} />
        <RecentTasksCard tasks={stats.nextOpen} />
        <LogoutButton />
      </ProfileLayout.Aside>
    </ProfileLayout>
  );
}
