import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Portal } from '@/shared/lib/dom';
import { ToastContext, type ToastOptions } from './toast-context';
import { UIToastItem } from './UIToastItem';

const DEFAULT_DURATION = 4000;

/** Больше одновременно не показываем: старые вытесняются. */
const MAX_VISIBLE = 3;

interface ToastRecord {
  readonly id: string;
  readonly message: ReactNode;
  readonly duration: number;
}

export interface IUIToastProviderProps {
  readonly children?: ReactNode;
}

/** Провайдер уведомлений: подключается один раз в корне приложения. */
export function UIToastProvider({ children }: IUIToastProviderProps) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: ReactNode, options: ToastOptions = {}) => {
    counterRef.current += 1;
    const id = `toast-${String(counterRef.current)}`;
    const record: ToastRecord = { id, message, duration: options.duration ?? DEFAULT_DURATION };
    setToasts((current) => [...current, record].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const context = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={context}>
      {children}
      <Portal>
        {/* Live-регион смонтирован всегда: иначе скринридер пропустит первое сообщение */}
        <div
          aria-live="polite"
          aria-atomic="false"
          data-name="UIToastRegion"
          className="pointer-events-none fixed bottom-[80px] left-1/2 z-60 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6"
        >
          {toasts.map((item) => (
            <UIToastItem
              key={item.id}
              message={item.message}
              duration={item.duration}
              onDismiss={() => {
                dismiss(item.id);
              }}
            />
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}
