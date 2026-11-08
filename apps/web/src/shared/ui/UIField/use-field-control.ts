import { useId } from 'react';
import { useFieldContext } from './field-context';

export interface UseFieldControlArgs {
  readonly id: string | undefined;
  readonly error: boolean | string | undefined;
  readonly disabled: boolean | undefined;
  readonly ariaDescribedBy: string | undefined;
}

export interface FieldControl {
  readonly controlId: string;
  readonly invalid: boolean;
  readonly disabled: boolean | undefined;
  readonly describedBy: string | undefined;
  /** Текст ошибки, который контрол показывает сам (вне UIField). */
  readonly errorText: string | undefined;
  readonly errorId: string | undefined;
}

/** Общая a11y-логика текстовых контролов: связывает их с UIField и текстом ошибки. */
export function useFieldControl({
  id,
  error,
  disabled,
  ariaDescribedBy,
}: UseFieldControlArgs): FieldControl {
  const field = useFieldContext();
  const generatedId = useId();
  const controlId = id ?? field?.controlId ?? generatedId;

  const errorText = typeof error === 'string' && error.length > 0 ? error : undefined;
  const errorId = errorText ? `${controlId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, field?.describedBy, errorId].filter(Boolean).join(' ') || undefined;

  return {
    controlId,
    invalid: (error != null && error !== false) || field?.invalid === true,
    disabled: disabled ?? field?.disabled,
    describedBy,
    errorText,
    errorId,
  };
}
