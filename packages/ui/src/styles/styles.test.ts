import { describe, expect, it } from "vitest";
import { rulesFor, sameSelector } from "../__tests__/emittedCss";
import { hoverQuery } from "../css/media";
import { vars } from "../theme/contract.css";
import { focusRing } from "./focus.css";
import { cardSurface, interactiveSurface } from "./surface.css";
import { visuallyHidden } from "./visuallyHidden.css";

const transparentHairline = `${vars.borderWidth.hairline} solid transparent`;

describe("focusRing", () => {
  it("is an outline on :focus-visible, offset from the control", () => {
    const rules = rulesFor(focusRing);
    expect(rules).toHaveLength(1);
    expect(sameSelector(rules[0].selector, `.${focusRing}:focus-visible`)).toBe(
      true,
    );
    expect(rules[0]).toMatchObject({
      conditions: [],
      declarations: {
        outline: `${vars.borderWidth.focus} solid ${vars.border.focus}`,
        "outline-offset": vars.size.focusOffset,
      },
    });
  });
});

describe("visuallyHidden", () => {
  it("takes the element out of view and out of the layout, not out of the accessibility tree", () => {
    const [rule] = rulesFor(visuallyHidden);
    expect(rule.declarations).toMatchObject({
      position: "absolute",
      overflow: "hidden",
      "clip-path": "inset(50%)",
      "white-space": "nowrap",
    });
    expect(rule.declarations).not.toHaveProperty("display");
    expect(rule.declarations).not.toHaveProperty("visibility");
  });
});

describe("cardSurface", () => {
  it("is a raised background with a transparent hairline border for forced colours", () => {
    expect(rulesFor(cardSurface)).toEqual([
      expect.objectContaining({
        conditions: [],
        declarations: {
          background: vars.surface.raised,
          border: transparentHairline,
          "border-radius": vars.radius.md,
        },
      }),
    ]);
  });
});

describe("interactiveSurface", () => {
  // A composed style is a list of classes; its own rules are on the first.
  const classes = interactiveSurface.split(" ");
  const own = classes[0];

  it("is a card surface with the focus ring", () => {
    expect(classes).toEqual(expect.arrayContaining([cardSurface, focusRing]));
  });

  it("changes only its background on hover, on devices that hover", () => {
    const hovered = rulesFor(own).filter((rule) =>
      sameSelector(rule.selector, `.${own}:hover`),
    );
    expect(hovered).toEqual([
      expect.objectContaining({
        conditions: [`@media ${hoverQuery}`],
        declarations: { background: vars.surface.raisedHover },
      }),
    ]);
  });
});
