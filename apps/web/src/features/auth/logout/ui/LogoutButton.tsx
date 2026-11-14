import { useState } from 'react';

import { authService } from '@/entities/auth';
import { UIButton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** Выход: сервис закроет сессию во всех вкладках, гард переведёт на вход. */
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const logout = async () => {
    setPending(true);
    try {
      await authService.logout();
    } finally {
      setPending(false);
    }
  };
  return (
    <UIButton
      variant='secondary'
      loading={pending}
      onClick={() => void logout()}
    >
      <UIIcons.Logout />
      Выйти из аккаунта
    </UIButton>
  );
}
