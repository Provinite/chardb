import { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emittedRules, rulesFor } from "../__tests__/emittedCss";
import { mount, render } from "../__tests__/render";
import { hoverQuery, touchQuery } from "../css/media";
import { focusRing } from "../styles/focus.css";
import { vars } from "../theme/contract.css";
import { timingMs } from "../theme/tokens";
import { Button, ButtonLink } from "./Button";
import * as styles from "./Button.css";

const buttonIn = (container: Element) => container.querySelector("button")!;

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("Button", () => {
  it("is a button that does not submit forms unless asked", () => {
    const button = buttonIn(render(<Button>Save</Button>));
    expect(button.type).toBe("button");
    expect(button.textContent).toBe("Save");
  });

  it("forwards its ref, className and other attributes", () => {
    const ref = createRef<HTMLButtonElement>();
    const button = buttonIn(
      render(
        <Button ref={ref} className="extra" data-testid="save" type="submit">
          Save
        </Button>,
      ),
    );
    expect(ref.current).toBe(button);
    expect(button.classList.contains("extra")).toBe(true);
    expect(button.dataset.testid).toBe("save");
    expect(button.type).toBe("submit");
  });

  it("takes its tone and size from the recipe, primary and md by default", () => {
    const plain = buttonIn(render(<Button>Save</Button>));
    const danger = buttonIn(
      render(
        <Button tone="danger" size="sm">
          Delete
        </Button>,
      ),
    );
    const has = (el: Element, classes: string) =>
      classes.split(" ").every((name) => el.classList.contains(name));
    expect(has(plain, styles.button({ tone: "primary", size: "md" }))).toBe(
      true,
    );
    expect(has(danger, styles.button({ tone: "danger", size: "sm" }))).toBe(
      true,
    );
  });

  it("wears the shared focus ring", () => {
    const button = buttonIn(render(<Button>Save</Button>));
    expect(button.classList.contains(focusRing)).toBe(true);
  });

  it("calls onClick with the event", () => {
    const onClick = vi.fn();
    buttonIn(render(<Button onClick={onClick}>Save</Button>)).click();
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ type: "click" }),
    );
  });

  it("is natively disabled when disabled", () => {
    const button = buttonIn(render(<Button disabled>Save</Button>));
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("renders its icon before the label", () => {
    const button = buttonIn(
      render(<Button icon={<svg data-testid="icon" />}>Save</Button>),
    );
    const label = button.querySelector(`.${styles.label}`)!;
    expect(label.firstElementChild?.getAttribute("data-testid")).toBe("icon");
  });

  describe("busy", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("blocks presses at once but stays focusable", () => {
      const button = buttonIn(render(<Button busy>Save</Button>));
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.disabled).toBe(false);
    });

    it("shows the spinner and sets aria-busy only after the loader delay", () => {
      const button = buttonIn(render(<Button busy>Save</Button>));
      const spinner = () => button.querySelector(`.${styles.spinnerSlot}`);

      expect(button.hasAttribute("aria-busy")).toBe(false);
      expect(spinner()).toBeNull();

      wait(timingMs.loader.delay);

      expect(button.getAttribute("aria-busy")).toBe("true");
      expect(spinner()).not.toBeNull();
    });

    it("keeps the label in place under the spinner, so the width holds", () => {
      const button = buttonIn(render(<Button busy>Save changes</Button>));
      wait(timingMs.loader.delay);

      const label = button.querySelector(`.${styles.label}`);
      expect(label?.textContent).toBe("Save changes");
    });

    it("swallows clicks without calling onClick", () => {
      const onClick = vi.fn();
      const button = buttonIn(
        render(
          <Button busy onClick={onClick}>
            Save
          </Button>,
        ),
      );
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      button.dispatchEvent(event);

      expect(onClick).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });

    it("does not submit its form", () => {
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      const container = render(
        <form onSubmit={onSubmit}>
          <Button type="submit" busy>
            Save
          </Button>
        </form>,
      );
      buttonIn(container).click();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("wins over disabled, so the spinner can show", () => {
      const button = buttonIn(
        render(
          <Button busy disabled>
            Save
          </Button>,
        ),
      );
      expect(button.disabled).toBe(false);
      expect(button.getAttribute("aria-disabled")).toBe("true");
    });

    it("stays blocked while the spinner is held for its minimum time", () => {
      const onClick = vi.fn();
      const { container, rerender } = mount(
        <Button busy onClick={onClick}>
          Save
        </Button>,
      );
      wait(timingMs.loader.delay);
      rerender(<Button onClick={onClick}>Save</Button>);

      const button = buttonIn(container);
      button.click();
      expect(onClick).not.toHaveBeenCalled();
      expect(button.getAttribute("aria-busy")).toBe("true");

      wait(timingMs.loader.minVisible);
      button.click();
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(button.hasAttribute("aria-disabled")).toBe(false);
    });
  });

  describe("styles", () => {
    // Renders once so vanilla-extract injects the stylesheet.
    beforeEach(() => {
      render(<Button size="sm">Save</Button>);
    });

    it("hides a busy button's label with opacity, keeping its space and its name", () => {
      // `visibility: hidden` or `display: none` would also take the label out
      // of the accessible name, leaving a busy button nameless.
      const rules = rulesFor(styles.label);
      const hidden = rules.filter((rule) => rule.declarations.opacity === "0");
      expect(hidden).toHaveLength(1);
      expect(hidden[0].selector).toContain('[aria-busy="true"]');
      expect(
        rules.some(
          (rule) =>
            rule.declarations.display === "none" ||
            rule.declarations.visibility === "hidden",
        ),
      ).toBe(false);
    });

    it("makes md at least 44px tall and wide everywhere", () => {
      const [md] = styles.button.classNames.variants.size.md.split(" ");
      expect(
        rulesFor(md).find((rule) => rule.conditions.length === 0)?.declarations,
      ).toMatchObject({
        "min-block-size": vars.size.target.comfortable,
        "min-inline-size": vars.size.target.comfortable,
      });
    });

    it("keeps sm at 24px or more, and grows it to 44px itself on touch", () => {
      const [sm] = styles.button.classNames.variants.size.sm.split(" ");
      const rules = rulesFor(sm);
      expect(
        rules.find((rule) => rule.conditions.length === 0)?.declarations,
      ).toMatchObject({ "min-block-size": vars.size.target.min });

      // The control grows, not an invisible hit area: hit areas centred on
      // neighbours in a dense row would overlap.
      expect(
        rules.find(
          (rule) =>
            rule.conditions.includes(`@media ${touchQuery}`) &&
            rule.selector === `.${sm}`,
        )?.declarations,
      ).toMatchObject({
        "min-inline-size": vars.size.target.comfortable,
        "min-block-size": vars.size.target.comfortable,
      });
      expect(rules.some((rule) => rule.selector.includes("::before"))).toBe(
        false,
      );
    });

    it("applies hover colours only on devices that hover", () => {
      const button = styles.button({ tone: "primary", size: "md" });
      const classes = button.split(" ");
      const hovered = emittedRules().filter(
        (rule) =>
          rule.selector.includes(":hover") &&
          classes.some((name) => rule.selector.includes(name)),
      );
      expect(hovered.length).toBeGreaterThan(0);
      for (const rule of hovered) {
        expect(rule.conditions).toContain(`@media ${hoverQuery}`);
      }
    });
  });
});

describe("ButtonLink", () => {
  it("renders the caller's own link, with the button's look", () => {
    const container = render(
      <ButtonLink tone="outline" size="sm">
        <a href="/characters" className="own">
          Characters
        </a>
      </ButtonLink>,
    );
    const link = container.querySelector("a")!;
    expect(container.children).toHaveLength(1);
    expect(link.getAttribute("href")).toBe("/characters");
    expect(link.classList.contains("own")).toBe(true);
    for (const name of styles
      .button({ tone: "outline", size: "sm" })
      .split(" ")) {
      expect(link.classList.contains(name)).toBe(true);
    }
    expect(link.querySelector(`.${styles.label}`)?.textContent).toBe(
      "Characters",
    );
  });

  it("puts its icon before the link's text", () => {
    const link = render(
      <ButtonLink icon={<svg data-testid="icon" />}>
        <a href="/">Home</a>
      </ButtonLink>,
    ).querySelector("a")!;
    const label = link.querySelector(`.${styles.label}`)!;
    expect(label.firstElementChild?.getAttribute("data-testid")).toBe("icon");
  });

  it("keeps the link's own ref and click handler", () => {
    const ref = createRef<HTMLAnchorElement>();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const link = render(
      <ButtonLink>
        <a ref={ref} href="/" onClick={onClick}>
          Home
        </a>
      </ButtonLink>,
    ).querySelector("a")!;
    link.click();
    expect(ref.current).toBe(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
