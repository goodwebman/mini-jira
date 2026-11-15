import { useSuspenseQuery } from '@tanstack/react-query';

import { myTaskStatsQueryOptions } from '@/entities/profile';
import { RecentTasksCard, TaskStatsCard } from '@/widgets/profile-overview';

export function Stats() {
  const { data: stats } = useSuspenseQuery(myTaskStatsQueryOptions);
  return (
    <>
      <TaskStatsCard stats={stats} />
      <RecentTasksCard tasks={stats.nextOpen} />
    </>
  );
}
