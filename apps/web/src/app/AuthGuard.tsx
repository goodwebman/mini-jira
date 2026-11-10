import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../entities/auth';
import { UISkeleton, UIAlert } from '../shared/ui';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, error } = useAuth();
  useEffect(() => {
    if (status === 'guest') location.replace(`/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
  }, [status]);
  if (status !== 'authenticated') return <main aria-busy="true" aria-label="Проверка сессии" className="mx-auto max-w-xl space-y-4 p-6">
    <UISkeleton className="h-8 w-1/2" /><UISkeleton className="h-40 w-full" />
    {error && <UIAlert>Нет связи с сервером. Повторяем подключение…</UIAlert>}
  </main>;
  return children;
}
