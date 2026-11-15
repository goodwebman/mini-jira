import { copyText } from '@/shared/lib/dom';
import { ROUTES } from '@/shared/routes';
import { UIButton, useToast } from '@/shared/ui';
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
    <UIButton variant='ghost' size='sm' onClick={() => void copy()}>
      <UIIcons.Copy />
      Ссылка
    </UIButton>
  );
}
