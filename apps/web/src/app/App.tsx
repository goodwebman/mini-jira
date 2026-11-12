import { useEffect } from 'react';

import { authService, useAuth } from '@/entities/auth';
import { KitGallery } from '@/pages/kit-gallery';
import { LoginPage, safeReturnTo } from '@/pages/login';
import { UIButton, UISkeleton } from '@/shared/ui';

import { AuthGuard } from './AuthGuard';

export default function App() {
  const { status, user } = useAuth();
  const loginPage = location.pathname === '/login';
  useEffect(() => {
    if (loginPage && status === 'authenticated')
      location.replace(
        safeReturnTo(new URLSearchParams(location.search).get('returnTo')),
      );
  }, [loginPage, status]);
  if (loginPage)
    return status === 'guest' ? (
      <LoginPage />
    ) : (
      <UISkeleton className='m-6 h-40' />
    );
  return (
    <AuthGuard>
      <header className='flex items-center justify-between gap-4 p-4'>
        <span>{user?.name}</span>
        <UIButton
          onClick={() => {
            void authService.logout();
          }}
        >
          Выйти
        </UIButton>
      </header>
      <KitGallery />
    </AuthGuard>
  );
}
