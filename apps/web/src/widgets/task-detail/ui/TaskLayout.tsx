import type { ReactNode } from 'react';

/**
 * От 960 px задача занимает две колонки: содержимое и панель свойств.
 * На узком экране панель встаёт сразу под описанием (`order`), до связей
 * и комментариев: статус и таймер важнее истории.
 */
export function TaskLayout({
  summary,
  properties,
  links,
  comments,
  timeHistory,
}: {
  readonly summary: ReactNode;
  readonly properties: ReactNode;
  readonly links: ReactNode;
  readonly comments: ReactNode;
  readonly timeHistory?: ReactNode;
}) {
  return (
    <div className='grid grid-cols-1 items-start gap-section w960:grid-cols-[minmax(0,1fr)_300px] w1280:grid-cols-[minmax(0,1fr)_360px] w1920:grid-cols-[minmax(0,1fr)_440px]'>
      <div className='contents w960:flex w960:min-w-0 w960:flex-col w960:gap-section'>
        <div className='order-1 min-w-0'>{summary}</div>
        <div className='order-3 min-w-0'>{timeHistory}</div>
        <div className='order-4 min-w-0'>{links}</div>
        <div className='order-5 min-w-0'>{comments}</div>
      </div>
      <aside aria-label='Свойства задачи' className='order-2 min-w-0'>
        {properties}
      </aside>
    </div>
  );
}
