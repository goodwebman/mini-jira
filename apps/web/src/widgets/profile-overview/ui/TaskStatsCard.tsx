import type { MyTaskStats } from '@gwmt/contracts';

import { formatNumber } from '@/shared/lib/format';
import { UICard } from '@/shared/ui';

/** «Мои задачи сейчас»: открыто, закрыто, всего SP. */
export function TaskStatsCard({ stats }: { readonly stats: MyTaskStats }) {
  const items = [
    { label: 'Открыто', value: String(stats.open) },
    { label: 'Закрыто', value: String(stats.closed) },
    { label: 'Всего SP', value: formatNumber(stats.totalSp) },
  ];
  return (
    <UICard className='flex flex-col gap-3'>
      <UICard.Title as='h2' size='sm'>
        Мои задачи сейчас
      </UICard.Title>
      <dl className='m-0 grid grid-cols-3 gap-3'>
        {items.map(({ label, value }) => (
          <div key={label} className='flex flex-col-reverse'>
            <dt className='text-caption text-muted-foreground'>{label}</dt>
            <dd className='m-0 text-display font-semibold tabular-nums'>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}
