import { memo } from 'react';

export interface IUISideNavTasksVizProps {
  /** Ближайшие задачи: показываются первые три. */
  readonly items: readonly string[];
}

/** Список ближайших задач на плитке. */
function UISideNavTasksVizBase({ items }: IUISideNavTasksVizProps) {
  return (
    // flex-wrap + w-full: строка, которой не хватило высоты, уходит в скрытую колонку целиком
    <div
      aria-hidden='true'
      className='flex min-h-0 flex-1 flex-col flex-wrap content-start justify-end gap-1 overflow-hidden'
    >
      {items.slice(0, 3).map((item, index) => (
        <div
          // eslint-disable-next-line @eslint-react/no-array-index-key -- Декоративные строки без состояния, названия задач могут повторяться.
          key={index}
          className='flex w-full flex-none items-center gap-2 text-small'
        >
          <span className='size-[12px] flex-none rounded-full border-2 border-(--tile-viz)' />
          <span className='min-w-0 truncate'>{item}</span>
        </div>
      ))}
    </div>
  );
}
export const UISideNavTasksViz = memo(UISideNavTasksVizBase);
