import { createContext, useContext } from 'react';

export interface DialogContextValue {
  readonly close: () => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

/** Доступ к закрытию диалога изнутри его содержимого. */
export function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Части UIDialog должны лежать внутри <UIDialog>');
  }
  return context;
}
