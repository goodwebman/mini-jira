import type { Timezone } from '@gwmt/contracts';

import { type IUISelectProps, UISelect } from '@/shared/ui';

import { TIMEZONE_OPTIONS, isTimezone } from '../model/timezone';

export function TimezoneSelect({
  value,
  onValueChange,
  ...props
}: Omit<IUISelectProps, 'onChange' | 'onValueChange' | 'options' | 'value'> & {
  readonly value: Timezone;
  readonly onValueChange: (value: Timezone) => void;
}) {
  return (
    <UISelect
      value={value}
      options={TIMEZONE_OPTIONS}
      onValueChange={(next) => {
        if (isTimezone(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
