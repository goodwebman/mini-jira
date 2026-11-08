import { createContext, useContext } from 'react';

export interface FieldContextValue {
  /** id контрола: на него указывает `htmlFor` подписи. */
  readonly controlId: string;
  /** id подсказки и ошибки для `aria-describedby` контрола. */
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly disabled: boolean | undefined;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** Контекст ближайшего UIField; `null`, если контрол используется сам по себе. */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}
