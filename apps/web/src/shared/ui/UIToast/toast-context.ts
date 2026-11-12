import { type ReactNode, createContext, useContext } from 'react';

export interface ToastOptions {
  /** Сколько показывать, мс. `0` — пока не закроют вручную. */
  readonly duration?: number;
}

export interface ToastContextValue {
  /** Показывает уведомление и возвращает его id. */
  readonly toast: (message: ReactNode, options?: ToastOptions) => string;
  readonly dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Показ уведомлений.
 *
 * @example
 * const { toast } = useToast();
 * toast('Профиль сохранён');
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast должен вызываться внутри <UIToastProvider>');
  }
  return context;
}
