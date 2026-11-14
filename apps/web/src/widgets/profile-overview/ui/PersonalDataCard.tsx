import type { Me } from '@gwmt/contracts';

import { UserAvatar } from '@/entities/user';
import { ProfileForm } from '@/features/profile/edit-profile';
import { UICard } from '@/shared/ui';

/** Личные данные: аватар с именем и форма профиля. */
export function PersonalDataCard({ me }: { readonly me: Me }) {
  return (
    <UICard padding='lg' className='flex flex-col gap-5'>
      <UICard.Title>Личные данные</UICard.Title>
      <div className='flex items-center gap-4'>
        <UserAvatar user={me} size='xl' />
        <div className='flex min-w-0 flex-col'>
          <span className='font-semibold'>{me.name}</span>
          <span className='text-small text-muted-foreground'>{me.job}</span>
        </div>
      </div>
      {/* key: после сохранения форма берёт новые данные как исходные */}
      <ProfileForm
        key={`${me.name}|${me.email}|${me.job}|${me.timezone}`}
        me={me}
      />
    </UICard>
  );
}
