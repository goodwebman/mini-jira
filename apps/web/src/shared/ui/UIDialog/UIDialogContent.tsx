import {
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
  useId,
  useRef,
} from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';
import { Portal } from '@/shared/lib/dom';
import {
  useEscape,
  useFocusTrap,
  useMergedRefs,
  useScrollLock,
} from '@/shared/lib/hooks';
import { UIIconButton } from '@/shared/ui/UIIconButton';
import { UIIcons } from '@/shared/ui/icons';

import { useDialogContext } from './dialog-context';

const dialogPanelVariants = cva(
  [
    'relative flex h-full w-full flex-col bg-surface shadow-modal outline-none animate-dialog-in',
    'sm:h-auto sm:max-h-full sm:rounded-modal',
  ],
  {
    variants: {
      size: {
        sm: 'sm:max-w-[520px] xl:max-w-[640px]',
        md: 'sm:max-w-[560px] xl:max-w-[720px]',
        lg: 'sm:max-w-[640px] xl:max-w-[800px]',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export interface IUIDialogContentProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof dialogPanelVariants> {
  readonly testId?: string;
  /** Заголовок окна. Обязателен: это доступное имя диалога. */
  readonly title: ReactNode;
  /** Пояснение под заголовком. */
  readonly description?: ReactNode;
  /** Не закрывать по клику на фон. */
  readonly persistent?: boolean;
  /** Подпись крестика. */
  readonly closeLabel?: string;
}

/**
 * Панель диалога: фон, фокус-ловушка, Escape, блокировка скролла. На телефоне — на весь экран.
 *
 * Для формы оберни Body и Footer: `<form className="flex min-h-0 flex-1 flex-col">`.
 */
const UIDialogContentBase = forwardRef<HTMLDivElement, IUIDialogContentProps>(
  (
    {
      className,
      testId,
      title,
      description,
      size,
      persistent = false,
      closeLabel = 'Закрыть',
      children,
      ...props
    },
    ref,
  ) => {
    const { close } = useDialogContext();
    const panelRef = useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRefs(panelRef, ref);
    const titleId = useId();
    const descriptionId = useId();

    useEscape(close);
    useScrollLock(true);
    useFocusTrap(panelRef, true);

    return (
      <Portal>
        <div className='fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-6'>
          <div
            aria-hidden='true'
            data-name='UIDialogOverlay'
            className='absolute inset-0 animate-fade-in bg-overlay'
            onClick={persistent ? undefined : close}
          />
          <div
            ref={mergedRef}
            role='dialog'
            aria-modal='true'
            aria-labelledby={titleId}
            aria-describedby={description != null ? descriptionId : undefined}
            tabIndex={-1}
            data-name={testId ? `UIDialog-${testId}` : 'UIDialog'}
            className={cn(dialogPanelVariants({ size }), className)}
            {...props}
          >
            <header className='flex shrink-0 items-center gap-2 border-b border-border py-4 pl-6 pr-4'>
              <div className='min-w-0 flex-1'>
                <h2 id={titleId} className='m-0 text-title font-semibold'>
                  {title}
                </h2>
                {description != null && (
                  <p
                    id={descriptionId}
                    className='m-0 mt-1 text-small text-muted-foreground'
                  >
                    {description}
                  </p>
                )}
              </div>
              <UIIconButton
                label={closeLabel}
                onClick={close}
                data-focus-skip=''
              >
                <UIIcons.X />
              </UIIconButton>
            </header>
            {children}
          </div>
        </div>
      </Portal>
    );
  },
);
UIDialogContentBase.displayName = 'UIDialogContent';
export const UIDialogContent = memo(UIDialogContentBase);
