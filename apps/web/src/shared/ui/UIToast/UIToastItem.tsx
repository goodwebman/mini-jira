import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { UIIcons } from '@/shared/ui/icons';
import { UIIconButton } from '@/shared/ui/UIIconButton';

interface IUIToastItemProps {
  readonly message: ReactNode;
  readonly duration: number;
  readonly onDismiss: () => void;
}

/** Одно уведомление: держит свой таймер и закрывается по истечении или кнопкой. */
export function UIToastItem({ message, duration, onDismiss }: IUIToastItemProps) {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (duration <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      dismiss();
    }, duration);
    return () => {
      clearTimeout(timer);
    };
  }, [duration]);

  return (
    // pointer-events-auto: контейнер региона пропускает клики, а сами уведомления — нет
    <div
      data-name="UIToast"
      className="pointer-events-auto flex max-w-full animate-toast-in items-center gap-2 rounded-control bg-inverse py-2 pl-4 pr-2 text-body text-inverse-foreground shadow-toast"
    >
      <span className="min-w-0 flex-1 text-left">{message}</span>
      <UIIconButton
        label="Закрыть уведомление"
        variant="ghost"
        size="xs"
        className="text-inverse-foreground hover:bg-white/10"
        onClick={() => {
          onDismiss();
        }}
      >
        <UIIcons.X />
      </UIIconButton>
    </div>
  );
}
