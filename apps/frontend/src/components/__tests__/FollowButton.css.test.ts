import { describe, expect, it } from "vitest";
import { hoverQuery, vars } from "@chardb/ui/theme";
import { rulesFor } from "../../__tests__/emittedCss";
import * as styles from "../FollowButton.css";

/** How many times a selector names the class: each one adds specificity. */
const timesNamed = (selector: string, className: string) =>
  selector.split(`.${className}`).length - 1;

describe("FollowButton styles", () => {
  it("stacks both labels in one cell, so the width holds as it flips", () => {
    const [labels] = rulesFor(styles.labels);
    expect(labels.declarations.display).toBe("grid");
    expect(rulesFor(styles.label)[0].declarations["grid-area"]).toBe("1 / 1");
    // Hidden by visibility: the unused label keeps its width but leaves the
    // accessible name.
    // A composed style is a list of classes; its own rules are on the first.
    const [own] = styles.inactiveLabel.split(" ");
    expect(
      rulesFor(own).some((rule) => rule.declarations.visibility === "hidden"),
    ).toBe(true);
  });

  it("turns a followed button red on hover, as a warning that a press unfollows", () => {
    const hovered = rulesFor(styles.following).filter(
      (rule) =>
        rule.conditions.includes(`@media ${hoverQuery}`) &&
        rule.selector.includes(":hover"),
    );
    expect(hovered).toHaveLength(1);
    expect(hovered[0].declarations).toMatchObject({
      "background-color": vars.status.danger.bgSubtle,
      color: vars.status.danger.fg,
      "border-color": vars.status.danger.border,
    });
  });

  it("leaves a disabled button's border to the disabled look", () => {
    const bordered = rulesFor(styles.following).filter(
      (rule) =>
        rule.conditions.length === 0 && "border-color" in rule.declarations,
    );
    expect(bordered).toHaveLength(1);
    expect(bordered[0].selector).toContain(":not(:disabled)");
  });

  it("outranks the Button recipe's own hover, whatever the stylesheet order", () => {
    // The recipe's hover is one class plus three pseudo-classes and an
    // attribute; naming the class twice puts this rule above it.
    const [hovered] = rulesFor(styles.following).filter((rule) =>
      rule.selector.includes(":hover"),
    );
    expect(timesNamed(hovered.selector, styles.following)).toBe(2);
  });
});
