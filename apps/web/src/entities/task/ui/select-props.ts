import { type IUISelectProps } from '@/shared/ui';

export type SelectBaseProps = Omit<
  IUISelectProps,
  'onChange' | 'onValueChange' | 'options' | 'value'
>;

export type All = 'all';

export const ALL: All = 'all';
