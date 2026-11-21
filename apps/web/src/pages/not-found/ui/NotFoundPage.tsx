import { Link } from 'react-router';

import { ROUTES } from '@/shared/routes';
import { UIEmptyState, buttonVariants } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { ShellPage } from '@/widgets/app-shell';

export function NotFoundPage() {
  return (
    <ShellPage title='Страница не найдена' className='justify-center'>
      <UIEmptyState
        icon={<UIIcons.CircleAlert />}
        title='Возможно, ссылка устарела или в ней опечатка'
        action={
          <Link to={ROUTES.BOARDS.build()} className={buttonVariants()}>
            К списку досок
          </Link>
        }
      />
    </ShellPage>
  );
}
