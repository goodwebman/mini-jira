import { UISideNavRoot } from './UISideNav';
import { UISideNavProfile } from './UISideNavProfile';
import { UISideNavTile } from './UISideNavTile';
import { UISideNavBoardViz, UISideNavSparkViz, UISideNavTasksViz } from './UISideNavViz';

export const UISideNav = Object.assign(UISideNavRoot, {
  Tile: UISideNavTile,
  Profile: UISideNavProfile,
  BoardViz: UISideNavBoardViz,
  TasksViz: UISideNavTasksViz,
  SparkViz: UISideNavSparkViz,
});

export type { IUISideNavProps } from './UISideNav';
export type { IUISideNavProfileProps } from './UISideNavProfile';
export type { IUISideNavTileProps } from './UISideNavTile';
export type {
  IUISideNavBoardVizProps,
  IUISideNavSparkVizProps,
  IUISideNavTasksVizProps,
} from './UISideNavViz';
