import { describe, expect, it } from "vitest";
import { rulesFor, type EmittedRule } from "../__tests__/emittedCss";
import { vars } from "../theme/contract.css";
import { flatten } from "../theme/paths";
import { hoverQuery, mq } from "./media";
import { sprinkles, type Sprinkles } from "./sprinkles.css";

/** The rules behind every class sprinkles returned, in class order. */
const rulesOf = (className: string): EmittedRule[] =>
  className.split(" ").flatMap(rulesFor);

/** Conditions and declarations only; selectors carry generated class names. */
const shape = ({ conditions, declarations }: EmittedRule) => ({
  conditions,
  declarations,
});

describe("sprinkles", () => {
  it("applies a plain value at every width", () => {
    expect(rulesOf(sprinkles({ display: "flex" })).map(shape)).toEqual([
      { conditions: [], declarations: { display: "flex" } },
    ]);
  });

  it("applies a responsive value from its breakpoint up", () => {
    const rules = rulesOf(
      sprinkles({ flexDirection: { base: "column", md: "row" } }),
    ).map(shape);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual(
      expect.arrayContaining([
        { conditions: [], declarations: { "flex-direction": "column" } },
        {
          conditions: [`@media ${mq("md")}`],
          declarations: { "flex-direction": "row" },
        },
      ]),
    );
  });

  it("takes space tokens for gap and padding", () => {
    const rules = rulesOf(sprinkles({ gap: "md", padding: "lg" })).map(shape);
    expect(rules).toHaveLength(5);
    expect(rules).toEqual(
      expect.arrayContaining([
        { conditions: [], declarations: { gap: "var(--space-md)" } },
        ...["top", "bottom", "left", "right"].map((side) => ({
          conditions: [],
          declarations: { [`padding-${side}`]: "var(--space-lg)" },
        })),
      ]),
    );
  });

  it("applies hover colours only on devices that hover, and not when disabled", () => {
    const rules = rulesOf(
      sprinkles({ backgroundColor: { hover: "surface.raised" } }),
    );
    expect(rules.map(shape)).toEqual([
      {
        conditions: [`@media ${hoverQuery}`],
        declarations: { "background-color": "var(--surface-raised)" },
      },
    ]);
    expect(rules[0].selector.endsWith(":hover:not(:disabled)")).toBe(true);
  });

  it("takes action backgrounds and borders", () => {
    const rules = rulesOf(
      sprinkles({
        backgroundColor: "action.primary.bgHover",
        borderColor: "action.danger.border",
      }),
    ).map(shape);
    expect(rules).toEqual(
      expect.arrayContaining([
        {
          conditions: [],
          declarations: {
            "background-color": "var(--action-primary-bgHover)",
          },
        },
        {
          conditions: [],
          declarations: { "border-color": "var(--action-danger-border)" },
        },
      ]),
    );
  });

  // The action names sprinkles takes are listed by hand; this catches a token
  // added to the theme but not to that list.
  it("takes every action background and border token", () => {
    const paths = Object.keys(flatten({ action: vars.action }));
    const backgrounds = paths.filter((path) => /\.bg\w*$/.test(path));
    const borders = paths.filter((path) => path.endsWith(".border"));
    expect(backgrounds.length).toBeGreaterThan(0);
    expect(borders.length).toBeGreaterThan(0);
    for (const path of backgrounds) {
      const value = path as Sprinkles["backgroundColor"];
      expect(() => sprinkles({ backgroundColor: value }), path).not.toThrow();
    }
    for (const path of borders) {
      const value = path as Sprinkles["borderColor"];
      expect(() => sprinkles({ borderColor: value }), path).not.toThrow();
    }
  });

  it("rejects colour names that are not tokens", () => {
    const badBackground = () =>
      // @ts-expect-error not a background token
      sprinkles({ backgroundColor: "surface.nope" });
    const badBorder = () =>
      // @ts-expect-error not a border token
      sprinkles({ borderColor: "action.primary.bgHover" });
    expect(badBackground).toThrow();
    expect(badBorder).toThrow();
  });

  it("takes semantic colour tokens by path", () => {
    expect(rulesOf(sprinkles({ color: "text.muted" })).map(shape)).toEqual([
      { conditions: [], declarations: { color: "var(--text-muted)" } },
    ]);
  });
});
