import { UIAlert } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** Плашка для гостя на экранах доски, задачи и участников. */
export function BoardReadOnlyBanner() {
  return (
    <UIAlert tone='warning' icon={<UIIcons.Eye />} role='status'>
      Вы гость на этой доске: можно только смотреть
    </UIAlert>
  );
}
