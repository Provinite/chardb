import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("renders the links it is given inside the footer", () => {
    render(
      <Footer>
        <a href="/privacy">Privacy</a>
      </Footer>,
    );

    const link = screen.getByRole("link", { name: "Privacy" });
    expect(screen.getByRole("contentinfo")).toContainElement(link);
  });
});
