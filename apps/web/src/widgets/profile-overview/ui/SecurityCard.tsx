import { ChangePasswordForm } from '@/features/profile/change-password';
import { UICard } from '@/shared/ui';

/** Безопасность: смена пароля (для OAuth-аккаунта — без текущего). */
export function SecurityCard({
  hasPassword,
}: {
  readonly hasPassword: boolean;
}) {
  return (
    <UICard padding='lg' className='flex flex-col gap-4'>
      <UICard.Title>Безопасность</UICard.Title>
      <ChangePasswordForm hasPassword={hasPassword} />
    </UICard>
  );
}
