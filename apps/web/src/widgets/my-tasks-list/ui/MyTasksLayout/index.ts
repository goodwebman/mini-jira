import { MyTasksLayoutFilters } from './MyTasksLayoutFilters';
import { MyTasksLayoutPager } from './MyTasksLayoutPager';
import { MyTasksLayoutRoot } from './MyTasksLayoutRoot';

/** `<MyTasksLayout>` со слотами `.Filters` и `.Pager`. */
export const MyTasksLayout = Object.assign(MyTasksLayoutRoot, {
  Filters: MyTasksLayoutFilters,
  Pager: MyTasksLayoutPager,
});
