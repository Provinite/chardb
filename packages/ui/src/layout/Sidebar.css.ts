import {
  createContainer,
  createVar,
  globalStyle,
  style,
  styleVariants,
} from "@vanilla-extract/css";
import { cq } from "../css/container";
import { containers, type ContainerSize } from "../css/containers";
import { vars } from "../theme/contract.css";

export const sidebarContainer = createContainer();
export const sideWidth = createVar();

export const wrapper = style({
  containerName: sidebarContainer,
  containerType: "inline-size",
});

export const layout = style({
  display: "flex",
  flexDirection: "column",
});

export const main = style({ minWidth: 0 });

export const side = style({});

export const sideWidths = styleVariants(vars.size.column, (size) => ({
  vars: { [sideWidth]: size },
}));

// Side by side, the panes align to the top so a sticky side pane can stick.
export const stackBelow = styleVariants(containers, (rem) => ({
  "@container": cq(sidebarContainer, {
    [rem]: { flexDirection: "row", alignItems: "flex-start" },
  }),
}));

for (const [size, rem] of Object.entries(containers)) {
  const sideBySide = stackBelow[size as ContainerSize];
  globalStyle(`${sideBySide} > ${main}`, {
    "@container": cq(sidebarContainer, { [rem]: { flex: "1 1 0" } }),
  });
  globalStyle(`${sideBySide} > ${side}`, {
    "@container": cq(sidebarContainer, { [rem]: { flex: `0 0 ${sideWidth}` } }),
  });
}
