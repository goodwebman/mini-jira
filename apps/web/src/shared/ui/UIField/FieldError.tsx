import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FieldErrorProps {
  readonly id: string | undefined;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Текст ошибки под контролом. */
export function FieldError({ id, className, children }: FieldErrorProps) {
  return (
    <span id={id} role="alert" className={cn('mt-1 block text-small text-destructive', className)}>
      {children}
    </span>
  );
}
