import { Link } from 'react-router';

import { ROUTES } from '@/shared/routes';
import { UIEmptyState, buttonVariants } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

export function NotFoundPage() {
  return (
    <div className='flex flex-1 items-center justify-center p-page'>
      <UIEmptyState
        icon={<UIIcons.CircleAlert />}
        title='Страница не найдена'
        description='Возможно, ссылка устарела или в ней опечатка.'
        action={
          <Link to={ROUTES.BOARDS.build()} className={buttonVariants()}>
            К списку досок
          </Link>
        }
      />
    </div>
  );
}
