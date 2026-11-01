/**
 * The light over a candy board: a dot on a circle for where it is, and a
 * slider for how high.
 */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { findTooltip } from "../../../__tests__/findTooltip";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { LightingControl } from "../LightingControl";
import * as styles from "../LightingControl.css";
import { DEFAULT_LIGHTING, type Lighting } from "../candyLighting";

// jsdom has no PointerEvent, and without one a fired pointer event carries no
// coordinates.
if (!("PointerEvent" in window)) {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.assign(window, { PointerEvent: PointerEventStub });
}

const renderControl = (value: Lighting | null = null) => {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={lightTheme}>
      <LightingControl value={value} onChange={onChange} />
    </ThemeProvider>,
  );
  return onChange;
};

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Lighting" }));
  return screen.findByRole("dialog", { name: "Lighting" });
};

const centre: Lighting = {
  x: 0,
  y: 0,
  height: 0.5,
  intensity: 0.5,
  colour: null,
  colourStrength: 0,
  spotlight: 0,
  cone: 0.5,
};

describe("LightingControl", () => {
  it("opens to the light's pad, height and intensity", async () => {
    renderControl();
    await open();
    expect(
      screen.getByRole("group", { name: "Light position" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Light height" })).toHaveValue(
      String(DEFAULT_LIGHTING.height),
    );
    expect(screen.getByRole("slider", { name: "Light intensity" })).toHaveValue(
      String(DEFAULT_LIGHTING.intensity),
    );
  });

  it("stands the height slider upright and lays intensity across", async () => {
    renderControl();
    await open();
    expect(
      screen.getByRole("slider", { name: "Light height" }),
    ).toHaveAttribute("aria-orientation", "vertical");
    expect(
      screen.getByRole("slider", { name: "Light intensity" }),
    ).not.toHaveAttribute("aria-orientation", "vertical");
  });

  it("moves the light with the arrow keys, further with Shift", async () => {
    const onChange = renderControl(centre);
    await open();
    screen.getByRole("group", { name: "Light position" }).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, x: 0.1 });
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, y: -0.25 });
  });

  it("puts the light under the pointer, kept over the board", async () => {
    const onChange = renderControl(centre);
    await open();
    const pad = screen.getByRole("group", { name: "Light position" });
    pad.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);

    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 75, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, x: 0.5 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 200, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, x: 1 });
  });

  it("sets how strong the light is", async () => {
    const onChange = renderControl(centre);
    await open();
    fireEvent.change(screen.getByRole("slider", { name: "Light intensity" }), {
      target: { value: "0.9" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, intensity: 0.9 });
  });

  it("colours the light from the palette, starting part way", async () => {
    const onChange = renderControl(centre);
    await open();
    const strength = screen.getByRole("slider", {
      name: "Light colour strength",
    });
    expect(
      within(
        screen.getByRole("radiogroup", { name: "Light colour" }),
      ).getByRole("radio", { name: "White light" }),
    ).toBeChecked();
    expect(strength).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Pumpkin" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...centre,
      colour: "#f97316",
      colourStrength: 0.3,
    });
  });

  it("sets how strongly a coloured light colours, a hundredth at a time", async () => {
    const lit = { ...centre, colour: "#7c3aed", colourStrength: 0.3 };
    const onChange = renderControl(lit);
    await open();
    const strength = screen.getByRole("slider", {
      name: "Light colour strength",
    });
    expect(strength).toBeEnabled();
    expect(strength).toHaveAttribute("step", "0.01");

    fireEvent.change(strength, { target: { value: "0.42" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...lit, colourStrength: 0.42 });
  });

  it("colours the light any colour from the custom picker", async () => {
    const onChange = renderControl(centre);
    await open();
    fireEvent.change(screen.getByLabelText("Custom light colour"), {
      target: { value: "#123456" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...centre,
      colour: "#123456",
      colourStrength: 0.3,
    });
  });

  it("narrows the light to a spotlight, its cone waiting until then", async () => {
    const onChange = renderControl(centre);
    await open();
    const spotlight = screen.getByRole("slider", { name: "Spotlight" });
    const cone = screen.getByRole("slider", { name: "Spotlight cone" });
    expect(spotlight).toHaveValue("0");
    expect(cone).toBeDisabled();
    for (const slider of [spotlight, cone]) {
      expect(slider).toHaveAttribute("step", "0.01");
    }

    fireEvent.change(spotlight, { target: { value: "0.6" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...centre, spotlight: 0.6 });
  });

  it("outlines on the pad where a spotlight lands, across from the light", async () => {
    renderControl({ ...centre, x: -0.5, y: 0.2, spotlight: 0.6 });
    await open();
    const pool = screen
      .getByRole("group", { name: "Light position" })
      .querySelector<HTMLElement>('[data-testid="spotlight-pool"]');
    // Placed through CSS variables, set on the element at runtime.
    const set = (v: string) =>
      pool?.style.getPropertyValue(v.slice("var(".length, -")".length));
    expect(set(styles.poolLeft)).toBe("75%");
    expect(set(styles.poolTop)).toBe("40%");
  });

  it("outlines no pool with no spotlight", async () => {
    renderControl(centre);
    await open();
    expect(
      screen
        .getByRole("group", { name: "Light position" })
        .querySelector('[data-testid="spotlight-pool"]'),
    ).toBe(null);
  });

  it("widens and narrows a spotlight's cone", async () => {
    const spot = { ...centre, spotlight: 0.6 };
    const onChange = renderControl(spot);
    await open();
    const cone = screen.getByRole("slider", { name: "Spotlight cone" });
    expect(cone).toBeEnabled();
    fireEvent.change(cone, { target: { value: "0.2" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...spot, cone: 0.2 });
  });

  it("goes back to white light", async () => {
    const onChange = renderControl({
      ...centre,
      colour: "#7c3aed",
      colourStrength: 0.5,
    });
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "White light" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...centre,
      colour: null,
      colourStrength: 0.5,
    });
  });

  it("goes back to the default light from an icon button named in a tooltip", async () => {
    const onChange = renderControl({ ...centre, x: 0.5, y: 0.5, intensity: 1 });
    await open();
    const reset = screen.getByRole("button", { name: "Default light" });
    expect(reset).not.toHaveTextContent(/\S/);

    await userEvent.hover(reset);
    expect(await findTooltip()).toHaveTextContent("Default light");
    await userEvent.click(reset);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
