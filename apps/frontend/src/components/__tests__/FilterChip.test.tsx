import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterChips } from "../FilterChip";

describe("FilterChips", () => {
  it("forwards its ref to the row", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<FilterChips ref={ref} />);
    expect(ref.current).toBe(container.firstElementChild);
  });
});
