import { UIButton } from '../UIButton';
import { UIEmptyState } from '../UIEmptyState';

export function ErrorBlock() {
  return (
    <div role='alert' className='flex min-h-screen items-center justify-center'>
      <UIEmptyState
        title='Что-то пошло не так...'
        description='Произошла непредвиденная ошибка. Попробуйте обновить страницу.'
        action={
          <UIButton onClick={() => window.location.reload()}>
            Обновить страницу
          </UIButton>
        }
      />
    </div>
  );
}
