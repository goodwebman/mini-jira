import { useCallback, useState } from 'react';

export interface UseControllableStateArgs<T> {
  /** Значение в controlled-режиме; `undefined` — компонент управляет собой сам. */
  readonly value?: T;
  /** Стартовое значение для uncontrolled-режима. */
  readonly defaultValue: T;
  readonly onChange?: (value: T) => void;
}

/** Единая логика controlled / uncontrolled для компонентов кита. */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateArgs<T>): [T, (next: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) {
        setInternal(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [isControlled ? value : internal, setValue];
}
