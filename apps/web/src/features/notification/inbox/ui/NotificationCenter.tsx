import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import {
  notificationTarget,
  notificationText,
  notificationsQueryOptions,
} from '@/entities/notification';
import {
  UIButton,
  UIDrawer,
  UIIconButton,
  UIIcons,
  UILink,
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
          <span
            aria-hidden='true'
            className='absolute -end-1 -top-1 rounded-full bg-primary px-1 text-caption text-primary-foreground tabular-nums'
          >
            {unread > 99 ? '99+' : unread}
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
        <div className='flex flex-col gap-2' aria-busy={query.isFetching}>
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
                className='flex min-w-0 flex-col gap-2 rounded-card border border-border p-3 wrap-anywhere'
              >
                <p>
                  {notification.readAt === null && <strong>Новое · </strong>}
                  {notificationText(notification)}
                </p>
                <time
                  dateTime={notification.createdAt}
                  className='text-caption text-muted-foreground tabular-nums'
                >
                  {new Date(notification.createdAt).toLocaleString('ru-RU')}
                </time>
                <div className='flex flex-wrap items-center gap-2'>
                  {notificationTarget(notification) && (
                    <UILink
                      render={<Link to={notificationTarget(notification)!} />}
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
                      {notification.taskKey
                        ? 'Открыть задачу'
                        : 'Открыть доску'}
                    </UILink>
                  )}
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
                  <UIIconButton
                    label='Удалить уведомление'
                    className='text-destructive hover:bg-destructive-tint'
                    disabled={actions.isPending}
                    onClick={() =>
                      actions.mutate({ type: 'delete', id: notification.id })
                    }
                  >
                    <UIIcons.Trash />
                  </UIIconButton>
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
