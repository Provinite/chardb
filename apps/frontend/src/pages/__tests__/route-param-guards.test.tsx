/**
 * Regression tests for the route-param guards on the species/variant/trait
 * admin pages.
 *
 * Each of these pages used to run its "missing route param" guard *before*
 * its hooks, so a render that hit the guard called fewer hooks than one that
 * did not. React tolerates that only until a single component instance
 * renders both ways -- then it throws and the page is dead.
 *
 * The second test in each block is the one with teeth: it renders with the
 * param present, then re-renders the same instance with it absent. Against
 * the old ordering React raises "Rendered fewer hooks than expected."
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

type Params = Record<string, string | undefined>;

// Mutable between renders so a single mounted component can see the param
// disappear -- which is the whole point of the ordering test below.
const routeParams = vi.hoisted(() => ({ current: {} as Params }));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  // Only useParams is mocked. useNavigate is left real on purpose: it calls
  // hooks of its own, so pages that call it above their guard still have a
  // non-zero pre-guard hook count for React to compare against. Stubbing it
  // would let the ordering test below pass against broken code.
  return { ...actual, useParams: () => routeParams.current };
});

vi.mock("react-hot-toast", () => {
  const stub = {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  };
  return { default: stub, toast: stub, Toaster: () => null };
});

import { SpeciesManagementPage } from "../SpeciesManagementPage";
import { SpeciesVariantManagementPage } from "../SpeciesVariantManagementPage";
import { TraitBuilderPage } from "../TraitBuilderPage";
import { VariantDetailPage } from "../VariantDetailPage";
import { EnumValueManagementPage } from "../EnumValueManagementPage";
import { EnumValueSettingsPage } from "../EnumValueSettingsPage";

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  // No mocks: with the param missing every query skips, and with it present
  // the queries only need to *start*, not resolve.
  <MockedProvider mocks={[]} addTypename={false}>
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
    </MemoryRouter>
  </MockedProvider>
);

interface PageCase {
  name: string;
  Component: React.ComponentType;
  param: string;
  message: string;
}

const cases: PageCase[] = [
  {
    name: "SpeciesManagementPage",
    Component: SpeciesManagementPage,
    param: "communityId",
    message: "Community ID is required",
  },
  {
    name: "SpeciesVariantManagementPage",
    Component: SpeciesVariantManagementPage,
    param: "speciesId",
    message: "Species ID is required",
  },
  {
    name: "TraitBuilderPage",
    Component: TraitBuilderPage,
    param: "speciesId",
    message: "Species ID is required",
  },
  {
    name: "VariantDetailPage",
    Component: VariantDetailPage,
    param: "variantId",
    message: "Variant ID is required",
  },
  {
    name: "EnumValueManagementPage",
    Component: EnumValueManagementPage,
    param: "traitId",
    message: "Trait ID is required",
  },
  {
    name: "EnumValueSettingsPage",
    Component: EnumValueSettingsPage,
    param: "variantId",
    message: "Variant ID is required",
  },
];

describe.each(cases)("$name", ({ Component, param, message }) => {
  beforeEach(() => {
    routeParams.current = {};
  });

  it("renders the guard message when its route param is missing", () => {
    render(<Component />, { wrapper: Providers });

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("keeps hook order stable when the param disappears between renders", () => {
    routeParams.current = { [param]: "00000000-0000-4000-8000-000000000000" };
    const { rerender } = render(<Component />, { wrapper: Providers });

    routeParams.current = {};

    // Against the pre-fix ordering this throws rather than rendering.
    expect(() => rerender(<Component />)).not.toThrow();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
