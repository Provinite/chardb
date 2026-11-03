import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandyStrip } from "../CandyStrip";

describe("CandyStrip", () => {
  it("shows each candy's picture, named", () => {
    render(<CandyStrip slugs={["candy-corn", "banana", "candy-corn"]} />);

    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("alt"))).toEqual([
      "candy corn",
      "banana",
      "candy corn",
    ]);
    expect(images[0].getAttribute("src")).toBe(
      "/halloween/candy/candy-corn.png",
    );
  });
});
