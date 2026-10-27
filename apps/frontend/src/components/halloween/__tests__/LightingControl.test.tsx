/**
 * The light over a candy board: a dot on a circle for where it is, and a
 * slider for how high.
 */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { MantineProvider } from "@mantine/core";
import { LightingControl } from "../LightingControl";
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
      <MantineProvider>
        <LightingControl value={value} onChange={onChange} />
      </MantineProvider>
    </ThemeProvider>,
  );
  return onChange;
};

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Lighting" }));
  return screen.findByRole("dialog", { name: "Lighting" });
};

const centre: Lighting = { x: 0, y: 0, height: 0.5, intensity: 0.5 };

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

  it("goes back to the default light from an icon button named in a tooltip", async () => {
    const onChange = renderControl({
      x: 0.5,
      y: 0.5,
      height: 0.5,
      intensity: 1,
    });
    await open();
    const reset = screen.getByRole("button", { name: "Default light" });
    expect(reset).not.toHaveTextContent(/\S/);

    await userEvent.hover(reset);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Default light",
    );
    await userEvent.click(reset);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
