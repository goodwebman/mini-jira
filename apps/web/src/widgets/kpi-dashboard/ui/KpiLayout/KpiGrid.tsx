import type { ReactNode } from 'react';

export function KpiGrid({ children }: { readonly children?: ReactNode }) {
  return <div className='grid grid-cols-12 gap-section'>{children}</div>;
}
