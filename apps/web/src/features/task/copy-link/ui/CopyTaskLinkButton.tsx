import { copyText } from '@/shared/lib/dom';
import { ROUTES } from '@/shared/routes';
import { UIButton, useToast } from '@/shared/ui';
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
    <UIButton variant='secondary' onClick={() => void copy()}>
      <UIIcons.Copy />
      Скопировать ссылку
    </UIButton>
  );
}
