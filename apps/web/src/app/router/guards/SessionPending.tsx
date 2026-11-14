import { UIAlert, UISkeleton } from '@/shared/ui';

/** Пока сессия не проверена, нельзя показать ни приложение, ни форму входа. */
export function SessionPending({ offline }: { readonly offline: boolean }) {
  return (
    <main
      aria-busy='true'
      aria-label='Проверка сессии'
      className='mx-auto flex w-full max-w-xl flex-col gap-4 p-6'
    >
      <UISkeleton className='h-8 w-1/2' />
      <UISkeleton className='h-40 w-full' />
      {offline && (
        <UIAlert tone='warning'>
          Нет связи с сервером. Повторяем подключение…
        </UIAlert>
      )}
    </main>
  );
}
