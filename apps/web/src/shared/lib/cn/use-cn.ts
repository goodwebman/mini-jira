import { clsx, type ClassValue } from 'clsx';
import { useMemo } from 'react';
import { cn } from './cn';

/**
 * `cn` с мемоизацией результата на время жизни компонента: merge пересчитывается,
 * только когда изменился итоговый набор классов.
 *
 * @example
 * const className = useCn('h-control rounded-control', isActive && 'bg-primary-tint', props.className);
 */
export function useCn(...inputs: ClassValue[]): string {
  const classes = clsx(inputs);
  return useMemo(() => cn(classes), [classes]);
}
