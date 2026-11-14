import { UIIconTile } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { boardTint } from '../model/board-view';

export function BoardIconTile({
  colorIndex,
  size = 'lg',
}: {
  readonly colorIndex: number;
  readonly size?: 'lg' | 'md' | 'sm';
}) {
  return (
    <UIIconTile tint={boardTint(colorIndex)} size={size}>
      <UIIcons.Board />
    </UIIconTile>
  );
}
