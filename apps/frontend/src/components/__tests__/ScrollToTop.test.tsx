import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "../ScrollToTop";

let go: (path: string) => void = () => {};
const Navigator = () => {
  go = useNavigate();
  return null;
};

describe("ScrollToTop", () => {
  afterEach(() => vi.restoreAllMocks());

  // A jump, not an animation, whatever the motion preference: the new page
  // simply starts at the top.
  it("jumps to the top when the page changes", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ScrollToTop />
        <Navigator />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    scrollTo.mockClear();

    act(() => go("/b"));

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  });
});
