import { UISideNavRoot } from './UISideNav';
import { UISideNavBoardViz } from './UISideNavBoardViz';
import { UISideNavProfile } from './UISideNavProfile';
import { UISideNavSparkViz } from './UISideNavSparkViz';
import { UISideNavTasksViz } from './UISideNavTasksViz';
import { UISideNavTile } from './UISideNavTile';

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
export type { IUISideNavBoardVizProps } from './UISideNavBoardViz';
export type { IUISideNavSparkVizProps } from './UISideNavSparkViz';
export type { IUISideNavTasksVizProps } from './UISideNavTasksViz';
