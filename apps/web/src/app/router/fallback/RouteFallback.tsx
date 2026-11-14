import { UISpinner } from '@/shared/ui';

/**
 * Первый экран, пока роутер догружает чанк страницы. Без него на медленной
 * сети пользователь смотрит на белый лист.
 */
export function RouteFallback() {
  return (
    <div
      role='status'
      aria-label='Загрузка приложения'
      className='flex min-h-dvh items-center justify-center bg-background text-muted-foreground'
    >
      <UISpinner className='size-icon-lg' />
    </div>
  );
}
