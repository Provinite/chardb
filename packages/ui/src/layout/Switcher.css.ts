import {
  createContainer,
  globalStyle,
  style,
  styleVariants,
} from "@vanilla-extract/css";
import { cq } from "../css/container";
import { containers } from "../css/containers";

export const switcherContainer = createContainer();

export const wrapper = style({
  containerName: switcherContainer,
  containerType: "inline-size",
});

export const row = style({
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${row} > *`, { minWidth: 0 });

export const stackBelow = styleVariants(containers, (rem) => ({
  "@container": cq(switcherContainer, { [rem]: { flexDirection: "row" } }),
}));

for (const [size, rem] of Object.entries(containers)) {
  globalStyle(`${stackBelow[size as keyof typeof containers]} > *`, {
    "@container": cq(switcherContainer, { [rem]: { flex: "1 1 0" } }),
  });
}
