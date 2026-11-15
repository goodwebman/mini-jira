import type { ReactNode } from 'react';

/**
 * Строка панели свойств: подпись слева, значение справа. С `htmlFor` подпись
 * связана с полем ввода; без него значение только для чтения.
 */
export function TaskPropertyRow({
  htmlFor,
  label,
  children,
}: {
  readonly htmlFor?: string;
  readonly label: string;
  readonly children?: ReactNode;
}) {
  const labelClass = 'text-muted-foreground';
  return (
    <>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <div className='flex min-h-control min-w-0 items-center [&>*]:max-w-full'>
        {children}
      </div>
    </>
  );
}
