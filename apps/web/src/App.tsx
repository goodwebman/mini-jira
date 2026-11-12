import { useEffect } from 'react';

import { AuthGuard } from './app/AuthGuard';
import { authService, useAuth } from './entities/auth';
import { KitGallery } from './kit-gallery/KitGallery';
import { LoginPage } from './pages/login/LoginPage';
import { safeReturnTo } from './pages/login/return-to';
import { UIButton, UISkeleton } from './shared/ui';

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
