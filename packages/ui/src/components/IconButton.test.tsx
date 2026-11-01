import { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rulesFor } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { touchQuery } from "../css/media";
import { focusRing } from "../styles/focus.css";
import { vars } from "../theme/contract.css";
import { timingMs } from "../theme/tokens";
import * as buttonStyles from "./Button.css";
import { IconButton } from "./IconButton";
import * as styles from "./IconButton.css";

const buttonIn = (container: Element) => container.querySelector("button")!;
const icon = <svg data-testid="icon" />;

describe("IconButton", () => {
  it("takes its accessible name from label", () => {
    const button = buttonIn(render(<IconButton label="Close" icon={icon} />));
    expect(button.getAttribute("aria-label")).toBe("Close");
    expect(button.type).toBe("button");
    expect(button.querySelector('[data-testid="icon"]')).not.toBeNull();
  });

  it("will not type-check without a label", () => {
    // @ts-expect-error -- an icon button with no name is not allowed
    render(<IconButton icon={icon} />);
  });

  it("forwards its ref, className and other attributes", () => {
    const ref = createRef<HTMLButtonElement>();
    const button = buttonIn(
      render(
        <IconButton
          ref={ref}
          label="Close"
          icon={icon}
          className="extra"
          aria-expanded={false}
        />,
      ),
    );
    expect(ref.current).toBe(button);
    expect(button.classList.contains("extra")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("takes its tone and size from the recipe, ghost and md by default", () => {
    const button = buttonIn(render(<IconButton label="Close" icon={icon} />));
    for (const name of styles
      .iconButton({ tone: "ghost", size: "md" })
      .split(" ")) {
      expect(button.classList.contains(name)).toBe(true);
    }
    expect(button.classList.contains(focusRing)).toBe(true);
  });

  describe("busy", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("blocks presses at once and shows the spinner after the delay, as Button does", () => {
      const onClick = vi.fn();
      const button = buttonIn(
        render(<IconButton label="Save" icon={icon} busy onClick={onClick} />),
      );
      button.click();
      expect(onClick).not.toHaveBeenCalled();
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.hasAttribute("aria-busy")).toBe(false);

      act(() => {
        vi.advanceTimersByTime(timingMs.loader.delay);
      });
      expect(button.getAttribute("aria-busy")).toBe("true");
      expect(
        button.querySelector(`.${buttonStyles.spinnerSlot}`),
      ).not.toBeNull();
      expect(
        button
          .querySelector(`.${buttonStyles.label}`)
          ?.querySelector('[data-testid="icon"]'),
      ).not.toBeNull();
    });
  });

  describe("styles", () => {
    beforeEach(() => {
      render(<IconButton label="Close" icon={icon} size="sm" />);
    });

    const ownRule = (variant: string) =>
      rulesFor(variant.split(" ")[0]).find(
        (rule) => rule.conditions.length === 0,
      )?.declarations;

    it("is a 44px square at md, everywhere", () => {
      expect(
        ownRule(styles.iconButton.classNames.variants.size.md),
      ).toMatchObject({
        "inline-size": vars.size.target.comfortable,
        "block-size": vars.size.target.comfortable,
      });
    });

    it("is a 24px square at sm, and a 44px square on touch", () => {
      const sm = styles.iconButton.classNames.variants.size.sm;
      const [own] = sm.split(" ");
      expect(ownRule(sm)).toMatchObject({
        "inline-size": vars.size.target.min,
        "block-size": vars.size.target.min,
      });
      expect(
        rulesFor(own).find(
          (rule) =>
            rule.conditions.includes(`@media ${touchQuery}`) &&
            rule.selector === `.${own}`,
        )?.declarations,
      ).toMatchObject({
        "inline-size": vars.size.target.comfortable,
        "block-size": vars.size.target.comfortable,
      });
    });
  });
});
