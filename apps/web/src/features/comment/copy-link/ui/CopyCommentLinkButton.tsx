import { copyText } from '@/shared/lib/dom';
import { ROUTES } from '@/shared/routes';
import { UIIconButton, useToast } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

export function CopyCommentLinkButton({
  taskKey,
  commentId,
}: {
  readonly taskKey: string;
  readonly commentId: string;
}) {
  const { toast } = useToast();
  const copy = async () => {
    const url = new URL(
      ROUTES.TASK_COMMENT.build(taskKey, commentId),
      location.origin,
    ).href;
    toast(
      (await copyText(url))
        ? 'Ссылка на комментарий скопирована'
        : `Скопируйте вручную: ${url}`,
    );
  };
  return (
    <UIIconButton
      label='Скопировать ссылку на комментарий'
      variant='muted'
      onClick={() => void copy()}
    >
      <UIIcons.Link />
    </UIIconButton>
  );
}
