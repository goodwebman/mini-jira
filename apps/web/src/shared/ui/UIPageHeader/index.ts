import { UIPageHeaderAction, UIPageHeaderRoot } from './UIPageHeader';
import { UIPageHeaderActionSkeleton } from './UIPageHeaderActionSkeleton';

export const UIPageHeader = Object.assign(UIPageHeaderRoot, {
  Action: UIPageHeaderAction,
  ActionSkeleton: UIPageHeaderActionSkeleton,
});

export type {
  IUIPageHeaderActionProps,
  IUIPageHeaderProps,
} from './UIPageHeader';
