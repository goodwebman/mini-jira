import { useState } from 'react';

import { type OAuthProvider, authService, useAuth } from '@/entities/auth';
import { UIAlert, UIButton } from '@/shared/ui';

const PROVIDERS: readonly {
  readonly id: OAuthProvider;
  readonly label: string;
}[] = [
  { id: 'github', label: 'Продолжить через GitHub' },
  { id: 'google', label: 'Продолжить через Google' },
];

/** Вход через провайдера: браузер уходит на API, обратно — на `returnTo`. */
export function OAuthButtons({ returnTo }: { readonly returnTo: string }) {
  const { phase } = useAuth();
  const [error, setError] = useState('');

  const start = async (provider: OAuthProvider) => {
    setError('');
    try {
      await authService.login({ sso: provider, returnTo });
    } catch {
      setError('Не удалось открыть страницу входа. Повторите попытку.');
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      {error && <UIAlert tone='danger'>{error}</UIAlert>}
      {PROVIDERS.map((provider) => (
        <UIButton
          key={provider.id}
          variant='secondary'
          size='lg'
          disabled={phase === 'signing-in' || phase === 'redirecting'}
          onClick={() => void start(provider.id)}
        >
          {provider.label}
        </UIButton>
      ))}
    </div>
  );
}
