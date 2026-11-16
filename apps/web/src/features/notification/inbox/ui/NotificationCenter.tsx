import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { notificationsQueryOptions } from '@/entities/notification';
import { ROUTES } from '@/shared/routes';
import {
  UIButton,
  UIDrawer,
  UIIconButton,
  UIIcons,
  UIRequestError,
} from '@/shared/ui';

import { useNotificationActions } from '../model/use-notification-actions';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery(notificationsQueryOptions(page));
  const actions = useNotificationActions();
  const data = query.data;
  const unread = data?.unreadCount ?? 0;

  return (
    <>
      <UIIconButton
        variant='secondary'
        className='relative shrink-0'
        onClick={() => setOpen(true)}
        label={`Уведомления, непрочитанных: ${String(unread)}`}
      >
        <UIIcons.Bell />
        {unread > 0 && (
          <span className='absolute -right-1 -top-1 rounded-full bg-primary px-1 text-caption text-primary-foreground'>
            {unread}
          </span>
        )}
      </UIIconButton>
      <UIDrawer
        open={open}
        onOpenChange={setOpen}
        title='Уведомления'
        actions={
          <UIButton
            disabled={unread === 0 || actions.isPending}
            onClick={() => actions.mutate({ type: 'readAll' })}
          >
            Прочитать все
          </UIButton>
        }
      >
        <div className='flex flex-col gap-3 p-4' aria-busy={query.isFetching}>
          {query.isPending && <p role='status'>Загрузка уведомлений…</p>}
          {query.isError && (
            <UIRequestError
              error={query.error}
              retry={() => {
                void query.refetch();
              }}
            />
          )}
          {data?.total === 0 && <p>Уведомлений пока нет</p>}
          {data &&
            data.items.map((notification) => (
              <article
                key={notification.id}
                className='flex flex-col gap-2 rounded-lg border p-3'
              >
                <p>
                  {notification.readAt === null && <strong>Новое. </strong>}Вас
                  добавили на доску «{notification.boardName}»
                </p>
                <time dateTime={notification.createdAt}>
                  {new Date(notification.createdAt).toLocaleString('ru-RU')}
                </time>
                <div className='flex flex-wrap items-center gap-2'>
                  <Link
                    to={ROUTES.BOARD.build(notification.boardId)}
                    onClick={(event) => {
                      if (
                        event.button !== 0 ||
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      if (notification.readAt === null)
                        actions.mutate({ type: 'read', id: notification.id });
                      setOpen(false);
                    }}
                  >
                    Открыть доску
                  </Link>
                  {notification.readAt === null && (
                    <UIButton
                      variant='secondary'
                      disabled={actions.isPending}
                      onClick={() =>
                        actions.mutate({ type: 'read', id: notification.id })
                      }
                    >
                      Прочитано
                    </UIButton>
                  )}
                  <UIButton
                    variant='secondary'
                    disabled={actions.isPending}
                    onClick={() =>
                      actions.mutate({ type: 'delete', id: notification.id })
                    }
                  >
                    Удалить
                  </UIButton>
                </div>
              </article>
            ))}
          {data && data.total > data.pageSize && (
            <nav
              aria-label='Страницы уведомлений'
              className='flex items-center gap-2'
            >
              <UIButton
                variant='secondary'
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </UIButton>
              <span>{page}</span>
              <UIButton
                variant='secondary'
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Далее
              </UIButton>
            </nav>
          )}
          {data && data.items.length === 0 && page > 1 && (
            <UIButton onClick={() => setPage(1)}>К новым уведомлениям</UIButton>
          )}
        </div>
      </UIDrawer>
    </>
  );
}
