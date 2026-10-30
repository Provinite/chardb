import { describe, expect, it } from "vitest";
import {
  classSelector,
  declarationsFor,
  ruleContaining,
  topLevelDeclarationsFor,
} from "../test/emittedCss";
import { hoverQuery, mq } from "./media";
import { sprinkles } from "./sprinkles.css";

const classes = (className: string) => className.split(" ");

describe("sprinkles", () => {
  it("applies a plain value at every width", () => {
    const [cls] = classes(sprinkles({ display: "flex" }));
    expect(declarationsFor(classSelector(cls))).toContain("display: flex");
  });

  it("applies a responsive value from its breakpoint up", () => {
    const [base, md] = classes(
      sprinkles({ flexDirection: { base: "column", md: "row" } }),
    );
    expect(declarationsFor(classSelector(base))).toContain(
      "flex-direction: column",
    );
    expect(declarationsFor(classSelector(md), `@media ${mq("md")}`)).toContain(
      "flex-direction: row",
    );
  });

  it("takes space tokens for gap and padding", () => {
    const className = sprinkles({ gap: "md", padding: "lg" });
    expect(classes(className)).toHaveLength(5);
    expect(ruleContaining(className, "gap:")).toContain("gap: var(--space-md)");
    for (const side of ["top", "bottom", "left", "right"]) {
      expect(ruleContaining(className, `padding-${side}:`)).toContain(
        `padding-${side}: var(--space-lg)`,
      );
    }
  });

  it("applies hover colours only on devices that hover", () => {
    const [cls] = classes(
      sprinkles({ backgroundColor: { hover: "surface.raised" } }),
    );
    expect(
      declarationsFor(`${classSelector(cls)}:hover`, `@media ${hoverQuery}`),
    ).toContain("background-color: var(--surface-raised)");
    expect(
      topLevelDeclarationsFor(`${classSelector(cls)}:hover`),
    ).toBeUndefined();
  });

  it("takes action backgrounds and borders", () => {
    const className = sprinkles({
      backgroundColor: "action.primary.bgHover",
      borderColor: "action.danger.border",
    });
    expect(ruleContaining(className, "background-color:")).toContain(
      "var(--action-primary-bgHover)",
    );
    expect(ruleContaining(className, "border-color:")).toContain(
      "var(--action-danger-border)",
    );
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
    const [cls] = classes(sprinkles({ color: "text.muted" }));
    expect(declarationsFor(classSelector(cls))).toContain(
      "color: var(--text-muted)",
    );
  });
});
