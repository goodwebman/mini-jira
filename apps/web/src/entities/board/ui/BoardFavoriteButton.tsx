import { UIIconButton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** Звёздочка «в избранное». Только вид: переключение делает фича. */
export function BoardFavoriteButton({
  boardName,
  isFavorite,
  onToggle,
  disabled,
}: {
  readonly boardName: string;
  readonly isFavorite: boolean;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <UIIconButton
      label={`Избранная доска «${boardName}»`}
      aria-pressed={isFavorite}
      size='lg'
      disabled={disabled}
      onClick={onToggle}
      className='mr-1 aria-pressed:text-primary'
    >
      <UIIcons.Star className={isFavorite ? 'fill-current' : undefined} />
    </UIIconButton>
  );
}
