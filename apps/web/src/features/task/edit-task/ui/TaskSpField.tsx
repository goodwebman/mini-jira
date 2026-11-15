import { type KeyboardEvent, useState } from 'react';

import { SP_ERROR, parseSp } from '@/entities/task';
import { formatNumber } from '@/shared/lib/format';
import { UIInput } from '@/shared/ui';

/**
 * Поле оценки: значение уходит на сервер по Enter или потере фокуса,
 * а не на каждую цифру. Неверный ввод подсвечивается и не отправляется.
 */
export function TaskSpField({
  id,
  value,
  onCommit,
  overEstimate = false,
}: {
  readonly id: string;
  readonly value: number;
  readonly onCommit: (sp: number) => void;
  readonly overEstimate?: boolean;
}) {
  const [draft, setDraft] = useState<null | string>(null);
  const shown = draft ?? formatNumber(value);
  const parsed = draft === null ? value : parseSp(draft);
  const error = parsed === null ? SP_ERROR : undefined;

  const commit = () => {
    if (parsed === null) return;
    setDraft(null);
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <UIInput
      id={id}
      inputMode='decimal'
      value={shown}
      error={error}
      className={overEstimate ? 'border-destructive bg-destructive-tint text-destructive' : undefined}
      title={overEstimate ? 'Затраченное время превысило оценку' : undefined}
      aria-invalid={error ? true : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') setDraft(null);
      }}
    />
  );
}
