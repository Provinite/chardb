import { SidebarMain, SidebarRoot, SidebarSide } from "./Sidebar";

export { Stack, type StackProps } from "./Stack";
export { Cluster, type ClusterProps } from "./Cluster";
export { Grid, type GridProps } from "./Grid";
export { Switcher, type SwitcherProps } from "./Switcher";
export type { SidebarRootProps, SidebarSideProps } from "./Sidebar";
export type { LayoutElement, LayoutProps } from "./element";

/**
 * Two panes side by side that stack when the space is narrow. Which side the
 * side pane sits on follows source order.
 */
export const Sidebar = {
  Root: SidebarRoot,
  Main: SidebarMain,
  Side: SidebarSide,
};
