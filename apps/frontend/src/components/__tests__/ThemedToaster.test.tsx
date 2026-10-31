import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { vars } from "@chardb/ui/theme";
import { afterEach, describe, expect, it } from "vitest";
import { rulesFor } from "../../__tests__/emittedCss";
import { ThemedToaster } from "../ThemedToaster";
import * as styles from "../ThemedToaster.css";

/** The unconditional declarations of a style, composed or not. */
const declarationsOf = (classNames: string) =>
  Object.assign(
    {},
    ...classNames
      .split(" ")
      .flatMap((name) => rulesFor(name))
      .filter((rule) => rule.conditions.length === 0)
      .map((rule) => rule.declarations),
  ) as Record<string, string>;

const toastFor = (text: string) =>
  screen.getByText(text).closest(`.${styles.toastBase}`) as HTMLElement;

describe("ThemedToaster", () => {
  afterEach(() => act(() => toast.remove()));

  it("shows a message with a dismiss button a finger can hit", async () => {
    render(<ThemedToaster />);
    act(() => {
      toast("Saved");
    });
    const dismiss = await screen.findByRole("button", {
      name: "Dismiss notification",
    });
    expect(declarationsOf(styles.dismiss)).toMatchObject({
      "inline-size": vars.size.target.comfortable,
      "block-size": vars.size.target.comfortable,
    });
    await userEvent.click(dismiss);
  });

  it("borders a success and an error in their status colours", async () => {
    render(<ThemedToaster />);
    act(() => {
      toast.success("Done");
      toast.error("Nope");
    });
    await screen.findByText("Nope");
    const borderOf = (el: HTMLElement) => {
      const tone = [...el.classList]
        .map((name) => rulesFor(name)[0]?.declarations["border-color"])
        .find(Boolean);
      return tone;
    };
    expect(borderOf(toastFor("Done"))).toBe(vars.status.success.border);
    expect(borderOf(toastFor("Nope"))).toBe(vars.status.danger.border);
  });

  it("styles toasts from the stylesheet, with nothing inline", async () => {
    render(<ThemedToaster />);
    act(() => {
      toast("Hello");
    });
    await screen.findByText("Hello");
    const el = toastFor("Hello");
    expect(el.getAttribute("style")).toBeNull();
    expect(rulesFor(styles.toastBase)[0].declarations).toMatchObject({
      background: vars.surface.raised,
      color: vars.text.default,
      "box-shadow": vars.shadow.lg,
    });
  });
});
