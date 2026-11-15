import { UIAlert } from '@/shared/ui';

import { RouteFallback } from '../fallback/RouteFallback';

/** Пока сессия не проверена, нельзя показать ни приложение, ни форму входа. */
export function SessionPending({ offline }: { readonly offline: boolean }) {
  return (
    <div aria-busy='true' aria-label='Проверка сессии'>
      <RouteFallback />
      {offline && (
        <UIAlert
          tone='warning'
          className='fixed bottom-4 left-1/2 z-50 w-max max-w-full -translate-x-1/2'
        >
          Нет связи с сервером. Повторяем подключение…
        </UIAlert>
      )}
    </div>
  );
}
