import { useCallback, useMemo, type ReactNode } from 'react';
import { DialogContext } from './dialog-context';

export interface IUIDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children?: ReactNode;
}

/**
 * Модальное окно. Содержимое монтируется только пока окно открыто.
 *
 * @example
 * <UIDialog open={open} onOpenChange={setOpen}>
 *   <UIDialog.Content title="Новая доска">
 *     <UIDialog.Body>…</UIDialog.Body>
 *     <UIDialog.Footer>
 *       <UIDialog.Close>Отмена</UIDialog.Close>
 *       <UIButton onClick={create}>Создать доску</UIButton>
 *     </UIDialog.Footer>
 *   </UIDialog.Content>
 * </UIDialog>
 */
export function UIDialogRoot({ open, onOpenChange, children }: IUIDialogProps) {
  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const context = useMemo(() => ({ close }), [close]);

  if (!open) {
    return null;
  }

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}
UIDialogRoot.displayName = 'UIDialog';
