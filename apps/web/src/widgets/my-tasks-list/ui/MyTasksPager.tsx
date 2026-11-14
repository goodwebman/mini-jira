import { UIButton } from '@/shared/ui';

/** «Назад · Страница X из Y · Дальше». */
export function MyTasksPager({
  page,
  pages,
  onPage,
}: {
  readonly page: number;
  readonly pages: number;
  readonly onPage: (page: number) => void;
}) {
  return (
    <>
      <UIButton
        variant='secondary'
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Назад
      </UIButton>
      <span className='text-small text-muted-foreground'>
        Страница {page} из {pages}
      </span>
      <UIButton
        variant='secondary'
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Дальше
      </UIButton>
    </>
  );
}
