import type { ReactNode } from 'react';

import { readApiError } from '@/shared/api';
import { UIButton } from '@/shared/ui/UIButton';
import { UIEmptyState } from '@/shared/ui/UIEmptyState';
import { UIIcons } from '@/shared/ui/icons';

export interface IUIRequestErrorProps {
  readonly error: unknown;
  readonly retry?: () => void;
  /** Заголовок для 404/403: «Доска не найдена». */
  readonly notFoundTitle?: string;
  /** Действие вместо «Повторить» для 404/403, например ссылка на список. */
  readonly notFoundAction?: ReactNode;
}

const NOT_FOUND_STATUSES = new Set([403, 404]);

/**
 * Экран ошибки запроса. 404/403 повторять бессмысленно, поэтому вместо
 * «Повторить» показывается путь назад. Остальное — текст сервера и повтор.
 *
 * @example
 * <UIRequestError error={error} retry={retry} notFoundTitle="Доска не найдена" />
 */
export function UIRequestError({
  error,
  retry,
  notFoundTitle = 'Не найдено',
  notFoundAction,
}: IUIRequestErrorProps) {
  const info = readApiError(error);
  const missing = info.status !== null && NOT_FOUND_STATUSES.has(info.status);

  return (
    <div
      role='alert'
      className='flex flex-1 items-center justify-center p-page'
    >
      <UIEmptyState
        icon={<UIIcons.CircleAlert />}
        title={missing ? notFoundTitle : 'Не удалось загрузить данные'}
        description={info.message}
        action={
          missing
            ? notFoundAction
            : retry && <UIButton onClick={retry}>Повторить</UIButton>
        }
      />
    </div>
  );
}
