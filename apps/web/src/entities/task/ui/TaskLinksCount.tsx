import { UIIcons } from '@/shared/ui/icons';

export function TaskLinksCount({ count }: { readonly count: number }) {
  if (count === 0) return null;
  return (
    <span
      title={`Связанных задач: ${String(count)}`}
      className='inline-flex items-center gap-0.5'
    >
      <UIIcons.Link className='size-icon-sm' aria-hidden='true' />
      {count}
    </span>
  );
}
