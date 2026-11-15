import { UISkeleton } from '@/shared/ui/UISkeleton';

import { UIPageHeaderAction } from './UIPageHeaderAction';
import type { IUIPageHeaderActionProps } from './types';

/** Невидимая настоящая кнопка задаёт размеры, включая мобильную версию. */
export function UIPageHeaderActionSkeleton(
  props: Pick<IUIPageHeaderActionProps, 'icon' | 'label'>,
) {
  return (
    <UISkeleton className='w-fit shrink-0'>
      <div className='invisible'>
        <UIPageHeaderAction {...props} disabled tabIndex={-1} />
      </div>
    </UISkeleton>
  );
}
