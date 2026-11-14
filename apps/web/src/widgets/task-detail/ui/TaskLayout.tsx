import type { ReactNode } from 'react';

/**
 * Раскладка задачи. От 800 px — две колонки: содержимое и панель свойств.
 * На узком экране панель встаёт сразу под описанием (`order`), до связей
 * и комментариев: статус и таймер важнее истории.
 */
export function TaskLayout({
  summary,
  properties,
  links,
  comments,
}: {
  readonly summary: ReactNode;
  readonly properties: ReactNode;
  readonly links: ReactNode;
  readonly comments: ReactNode;
}) {
  return (
    <div className='grid grid-cols-1 items-start gap-section md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_440px]'>
      <div className='contents md:flex md:min-w-0 md:flex-col md:gap-section'>
        <div className='order-1 min-w-0'>{summary}</div>
        <div className='order-3 min-w-0'>{links}</div>
        <div className='order-4 min-w-0'>{comments}</div>
      </div>
      <aside aria-label='Свойства задачи' className='order-2 min-w-0'>
        {properties}
      </aside>
    </div>
  );
}
