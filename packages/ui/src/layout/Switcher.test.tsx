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
import { Switcher } from "./Switcher";
import { switcherContainer } from "./Switcher.css";

const at = (rem: number) =>
  `@container ${switcherContainer} (min-width: ${rem}rem)`;

describe("Switcher", () => {
  it("wraps its row in an inline-size container", () => {
    const wrapper = render(<Switcher stackBelow="md" />).firstElementChild!;
    expect(declarationsOf(wrapper)).toMatchObject({
      "container-name": switcherContainer,
      "container-type": "inline-size",
    });
  });

  it("is a column until the container reaches its width, then a row", () => {
    const row = render(<Switcher stackBelow="md" gap="md" />).firstElementChild!
      .firstElementChild!;
    expect(declarationsOf(row)).toMatchObject({
      display: "flex",
      "flex-direction": "column",
      gap: vars.space.md,
    });
    expect(declarationsOf(row, [at(containers.md)])).toEqual({
      "flex-direction": "row",
    });
  });

  it("shares the row equally between its children", () => {
    const row = render(<Switcher stackBelow="sm" />).firstElementChild!
      .firstElementChild!;
    const childRules = [...row.classList].flatMap((name) =>
      rulesFor(name).filter((rule) =>
        sameSelector(rule.selector, `.${name} > *`),
      ),
    );
    expect(childRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conditions: [],
          declarations: { "min-width": "0" },
        }),
        expect.objectContaining({
          conditions: [at(containers.sm)],
          declarations: { flex: "1 1 0" },
        }),
      ]),
    );
  });

  it("puts `as`, ref and the element's own props on the row", () => {
    const ref = createRef<HTMLElement>();
    const row = render(
      <Switcher stackBelow="md" as="fieldset" ref={ref} disabled />,
    ).firstElementChild!.firstElementChild!;
    expect(row.tagName).toBe("FIELDSET");
    expect(ref.current).toBe(row);
    expect(row.hasAttribute("disabled")).toBe(true);
  });

  it("puts className on the container, which places it in its parent", () => {
    const wrapper = render(
      <Switcher stackBelow="md" className="extra" />,
    ).firstElementChild!;
    expect(wrapper.classList).toContain("extra");
    expect(wrapper.firstElementChild!.classList).not.toContain("extra");
  });
});
