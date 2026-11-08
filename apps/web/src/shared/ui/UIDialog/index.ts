import { UIDialogContent } from './UIDialogContent';
import { UIDialogBody, UIDialogClose, UIDialogFooter } from './UIDialogParts';
import { UIDialogRoot } from './UIDialogRoot';

export const UIDialog = Object.assign(UIDialogRoot, {
  Content: UIDialogContent,
  Body: UIDialogBody,
  Footer: UIDialogFooter,
  Close: UIDialogClose,
});

export { useDialogContext } from './dialog-context';
export type { IUIDialogProps } from './UIDialogRoot';
export type { IUIDialogContentProps } from './UIDialogContent';
export type {
  IUIDialogBodyProps,
  IUIDialogCloseProps,
  IUIDialogFooterProps,
} from './UIDialogParts';
