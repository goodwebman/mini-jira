import { useSuspenseQuery } from '@tanstack/react-query';

import { profileQueryOptions } from '@/entities/profile';
import { PersonalDataCard } from '@/widgets/profile-overview';

export function PersonalData() {
  const { data: me } = useSuspenseQuery(profileQueryOptions);
  return <PersonalDataCard me={me} />;
}
