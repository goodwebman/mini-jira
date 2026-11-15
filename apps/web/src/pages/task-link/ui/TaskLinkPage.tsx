import { Link, useParams } from 'react-router';

import { AsyncBoundary } from '@/shared/lib/react';
import { ROUTES } from '@/shared/routes';
import { UIRequestError, buttonVariants } from '@/shared/ui';
import { ShellPageSkeleton } from '@/widgets/app-shell';
import { TaskSkeleton } from '@/widgets/task-detail';

import { TaskRedirect } from './TaskRedirect';

/**
 * Постоянная ссылка `/tasks/KEY`: её копируют и пересылают, доска в ней не указана.
 * Загружаем задачу, узнаём доску и ведём в её скоуп — там работают фильтры
 * и кнопка «Назад». Задача уже в кэше, второй запрос не нужен.
 */
export function TaskLinkPage() {
  const { taskKey = '' } = useParams();
  return (
    <AsyncBoundary
      resetKeys={[taskKey]}
      fallback={
        <ShellPageSkeleton label='Открываем задачу' title={taskKey}>
          <TaskSkeleton />
        </ShellPageSkeleton>
      }
      renderError={({ error, retry }) => (
        <UIRequestError
          error={error}
          retry={retry}
          notFoundTitle='Задача не найдена или недоступна'
          notFoundAction={
            <Link to={ROUTES.BOARDS.build()} className={buttonVariants()}>
              К списку досок
            </Link>
          }
        />
      )}
    >
      <TaskRedirect taskKey={taskKey} />
    </AsyncBoundary>
  );
}
