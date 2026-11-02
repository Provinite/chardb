import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { render, screen } from "../../__tests__/test-utils";
import { PrivacyPage } from "../PrivacyPage";
import { apexRoutes } from "../../routes/ApexRoutes";
import { communityRoutes } from "../../routes/CommunityRoutes";
import { PrivacyPage as LazyPrivacyPage } from "../../routes/pages";

describe("PrivacyPage", () => {
  it("renders the privacy document", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Your data on CharDB" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "AI" }),
    ).toBeInTheDocument();
  });

  // The footer links to /privacy on every host, so both tables must answer it
  // rather than falling through to the 404.
  it.each([
    ["apex", apexRoutes],
    ["community", communityRoutes],
  ])("is routed at /privacy on the %s host", (_host, routes) => {
    const matches = matchRoutes(createRoutesFromChildren(routes), "/privacy");
    const element = matches?.[matches.length - 1]?.route.element;

    expect(isValidElement(element) && element.type).toBe(LazyPrivacyPage);
  });
});
