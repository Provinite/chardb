import { createRef } from "react";
import { describe, expect, it } from "vitest";
import {
  declarationsOf,
  rulesFor,
  sameSelector,
} from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { containers } from "../css/containers";
import { vars } from "../theme/contract.css";
import { Sidebar } from ".";
import { sidebarContainer, sideWidth } from "./Sidebar.css";

const at = (rem: number) =>
  `@container ${sidebarContainer} (min-width: ${rem}rem)`;

const propertyName = (ref: string) => ref.slice("var(".length, -")".length);

const renderSidebar = () => {
  const wrapper = render(
    <Sidebar.Root stackBelow="lg" gap="lg">
      <Sidebar.Main>main</Sidebar.Main>
      <Sidebar.Side width="xl" as="aside">
        side
      </Sidebar.Side>
    </Sidebar.Root>,
  ).firstElementChild!;
  const layout = wrapper.firstElementChild!;
  const [main, side] = [...layout.children];
  return { wrapper, layout, main, side };
};

/** Rules for `.<layout class> > .<part class>`: the part, once the layout is a row. */
const rulesInLayout = (layout: Element, part: Element) =>
  [...layout.classList].flatMap((outer) =>
    [...part.classList].flatMap((inner) =>
      rulesFor(outer).filter((rule) =>
        sameSelector(rule.selector, `.${outer} > .${inner}`),
      ),
    ),
  );

describe("Sidebar", () => {
  it("wraps its layout in an inline-size container", () => {
    const { wrapper } = renderSidebar();
    expect(declarationsOf(wrapper)).toMatchObject({
      "container-name": sidebarContainer,
      "container-type": "inline-size",
    });
  });

  it("stacks until the container reaches its width, then sits side by side", () => {
    const { layout } = renderSidebar();
    expect(declarationsOf(layout)).toMatchObject({
      display: "flex",
      "flex-direction": "column",
      gap: vars.space.lg,
    });
    expect(declarationsOf(layout, [at(containers.lg)])).toEqual({
      "flex-direction": "row",
      "align-items": "flex-start",
    });
  });

  it("gives the side its width and the main pane the rest, once side by side", () => {
    const { layout, main, side } = renderSidebar();
    expect(declarationsOf(main)).toMatchObject({ "min-width": "0" });
    expect(declarationsOf(side)[propertyName(sideWidth)]).toBe(
      vars.size.column.xl,
    );
    expect(rulesInLayout(layout, main)).toEqual([
      expect.objectContaining({
        conditions: [at(containers.lg)],
        declarations: { flex: "1 1 0" },
      }),
    ]);
    expect(rulesInLayout(layout, side)).toEqual([
      expect.objectContaining({
        conditions: [at(containers.lg)],
        declarations: { flex: `0 0 ${sideWidth}` },
      }),
    ]);
  });

  it("keeps the parts in source order and renders the elements named by `as`", () => {
    const { main, side } = renderSidebar();
    expect(main.textContent).toBe("main");
    expect(side.tagName).toBe("ASIDE");
  });

  it("puts the root's ref on the layout and its className on the container", () => {
    const rootRef = createRef<HTMLElement>();
    const sideRef = createRef<HTMLElement>();
    const wrapper = render(
      <Sidebar.Root stackBelow="md" ref={rootRef} className="root">
        <Sidebar.Main>main</Sidebar.Main>
        <Sidebar.Side width="md" ref={sideRef} className="side">
          side
        </Sidebar.Side>
      </Sidebar.Root>,
    ).firstElementChild!;
    const layout = wrapper.firstElementChild!;
    expect(rootRef.current).toBe(layout);
    expect(wrapper.classList).toContain("root");
    expect(layout.classList).not.toContain("root");
    expect(sideRef.current).toBe(layout.children[1]);
    expect(layout.children[1].classList).toContain("side");
  });
});
