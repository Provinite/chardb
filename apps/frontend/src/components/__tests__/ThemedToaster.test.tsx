import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { Dialog, INERT_EXEMPT } from "@chardb/ui";
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

  it("borders and tints a success and an error in their status colours", async () => {
    render(<ThemedToaster />);
    act(() => {
      toast("Note");
      toast.success("Done");
      toast.error("Nope");
    });
    await screen.findByText("Nope");
    const looks = (text: string) => {
      const declarations = declarationsOf(toastFor(text).className);
      return {
        border: declarations["border-color"],
        background: declarations.background,
      };
    };
    expect(looks("Note")).toEqual({
      border: vars.border.default,
      background: vars.surface.raised,
    });
    expect(looks("Done")).toEqual({
      border: vars.status.success.border,
      background: vars.status.success.bgSubtle,
    });
    expect(looks("Nope")).toEqual({
      border: vars.status.danger.border,
      background: vars.status.danger.bgSubtle,
    });
  });

  it("keeps toasts clickable and focusable while a dialog is open", async () => {
    render(
      <>
        <ThemedToaster />
        <Dialog.Root open onClose={() => {}} aria-label="Rename">
          <input aria-label="Name" />
        </Dialog.Root>
      </>,
    );
    act(() => {
      toast("Saved");
    });
    const dismiss = await screen.findByRole("button", {
      name: "Dismiss notification",
    });

    // In its own child of the body, which the dialog leaves out of `inert`.
    expect(dismiss.closest("[inert]")).toBeNull();
    const host = [...document.body.children].find((el) =>
      el.contains(dismiss),
    )!;
    expect(host.hasAttribute(INERT_EXEMPT)).toBe(true);
    act(() => dismiss.focus());
    expect(document.activeElement).toBe(dismiss);
  });

  it("hands focus back to where it came from when a focused toast goes", async () => {
    render(
      <>
        <ThemedToaster />
        <Dialog.Root open onClose={() => {}} aria-label="Rename">
          <input aria-label="Name" />
        </Dialog.Root>
      </>,
    );
    const field = screen.getByRole("textbox", { name: "Name" });
    act(() => field.focus());
    let id = "";
    act(() => {
      id = toast("Saved");
    });
    const dismiss = await screen.findByRole("button", {
      name: "Dismiss notification",
    });
    act(() => dismiss.focus());

    act(() => toast.remove(id));

    expect(document.activeElement).toBe(field);
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
