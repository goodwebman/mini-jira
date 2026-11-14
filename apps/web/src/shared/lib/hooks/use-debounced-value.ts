import { useEffect, useState } from 'react';

/**
 * Значение, которое догоняет `value` после паузы ввода. Поиск по серверу
 * не уходит на каждую букву, а старые ответы TanStack Query отменяет сам.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
