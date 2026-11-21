import { copyText } from '@/shared/lib/dom';
import { ROUTES } from '@/shared/routes';
import { UIIconButton, useToast } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** Копирует постоянную ссылку `/tasks/KEY`: она откроется у любого участника доски. */
export function CopyTaskLinkButton({ taskKey }: { readonly taskKey: string }) {
  const { toast } = useToast();
  const copy = async () => {
    const url = new URL(ROUTES.TASK.build(taskKey), location.origin).href;
    toast(
      (await copyText(url))
        ? 'Ссылка скопирована'
        : `Скопируйте вручную: ${url}`,
    );
  };
  return (
    <UIIconButton
      label='Скопировать ссылку'
      variant='muted'
      onClick={() => void copy()}
    >
      <UIIcons.Link />
    </UIIconButton>
  );
}
