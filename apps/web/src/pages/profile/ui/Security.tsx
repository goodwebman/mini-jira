import { useSuspenseQuery } from '@tanstack/react-query';

import { profileQueryOptions } from '@/entities/profile';
import { SecurityCard } from '@/widgets/profile-overview';

export function Security() {
  const { data: me } = useSuspenseQuery(profileQueryOptions);
  return <SecurityCard hasPassword={me.hasPassword} />;
}
