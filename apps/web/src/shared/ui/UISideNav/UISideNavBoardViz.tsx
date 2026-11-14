import { memo } from 'react';

const MAX_PIPS = 6;

export interface IUISideNavBoardVizProps {
  /** Количество задач в каждой колонке доски. */
  readonly columns: readonly number[];
}

/** Мини-доска на плитке: колонки с плашками задач. */
function UISideNavBoardVizBase({ columns }: IUISideNavBoardVizProps) {
  return (
    <div
      aria-hidden='true'
      className='flex min-h-0 flex-1 gap-1 overflow-hidden'
    >
      {columns.map((count, column) => (
        <div
          // eslint-disable-next-line @eslint-react/no-array-index-key -- Колонки миниатюры обозначают позиции; это счётчики без состояния и идентификаторов задач.
          key={column}
          className='flex min-w-0 flex-1 flex-col flex-wrap content-start gap-[3px] overflow-hidden rounded-tag bg-(--tile-soft) p-[3px]'
        >
          {Array.from(
            { length: Math.min(MAX_PIPS, Math.max(0, count)) },
            (_, pip) => (
              <div
                key={pip}
                className='h-[9px] w-full flex-none rounded-[3px] bg-(--tile-viz)'
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
export const UISideNavBoardViz = memo(UISideNavBoardVizBase);
