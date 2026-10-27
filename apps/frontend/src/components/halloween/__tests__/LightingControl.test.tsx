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

const renderControl =(value: Lighting | null = null) => {
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

describe("LightingControl", () => {
  it("opens to the light's pad and height", async () => {
    renderControl();
    await open();
    expect(
      screen.getByRole("group", { name: "Light position" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Light height" })).toHaveValue(
      String(DEFAULT_LIGHTING.height),
    );
  });

  it("moves the light with the arrow keys, further with Shift", async () => {
    const onChange = renderControl({ x: 0, y: 0, height: 0.5 });
    await open();
    screen.getByRole("group", { name: "Light position" }).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.1, y: 0, height: 0.5 });
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: -0.25, height: 0.5 });
  });

  it("puts the light under the pointer, kept over the board", async () => {
    const onChange = renderControl({ x: 0, y: 0, height: 0.5 });
    await open();
    const pad = screen.getByRole("group", { name: "Light position" });
    pad.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);

    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 75, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0, height: 0.5 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 200, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ x: 1, y: 0, height: 0.5 });
  });

  it("goes back to the default light", async () => {
    const onChange = renderControl({ x: 0.5, y: 0.5, height: 0.5 });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Default light" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
