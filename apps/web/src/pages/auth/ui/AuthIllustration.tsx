const columns = [
  {
    label: 'К работе',
    dot: 'bg-status-todo',
    border: 'border-s-status-todo',
    tasks: [
      ['PAY-24', 'Добавить оплату по СБП'],
      ['PAY-25', 'Уточнить условия возврата'],
    ],
  },
  {
    label: 'В работе',
    dot: 'bg-status-work',
    border: 'border-s-status-work',
    tasks: [
      ['PAY-21', 'Обновить форму оплаты'],
      ['PAY-23', 'Сверить статусы операций'],
    ],
  },
  {
    label: 'Готово',
    dot: 'bg-status-done',
    border: 'border-s-status-done',
    tasks: [['PAY-18', 'Добавить историю платежей']],
  },
];

/** Пример доски для экрана входа. */
export function AuthIllustration() {
  return (
    <div
      aria-hidden='true'
      className='rounded-modal border border-border bg-surface p-4 shadow-popover w1280:p-5'
    >
      <div className='mb-4 flex flex-wrap items-baseline justify-between gap-2'>
        <span className='text-title font-semibold'>Платёжная платформа</span>
        <span className='text-caption text-muted-foreground'>Спринт 12</span>
      </div>
      <div className='grid grid-cols-2 gap-2 w1280:grid-cols-3'>
        {columns.map(({ label, dot, border, tasks }) => (
          <div
            key={label}
            className='flex min-w-0 flex-col gap-2 rounded-control bg-column p-2 max-w1280:last:hidden'
          >
            <div className='flex items-center gap-2 px-1 text-small font-medium'>
              <span className={`size-2 shrink-0 rounded-full ${dot}`} />
              {label}
            </div>
            {tasks.map(([key, title]) => (
              <div
                key={key}
                className={`rounded-control border border-border border-s-2 bg-surface p-2 ${border}`}
              >
                <div className='text-caption text-muted-foreground tabular-nums'>
                  {key}
                </div>
                <div className='mt-1 text-small font-medium wrap-anywhere'>
                  {title}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
