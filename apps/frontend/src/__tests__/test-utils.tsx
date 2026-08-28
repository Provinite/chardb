import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { vi } from "vitest";
import type { MeQuery, UpdateProfileMutation } from "../generated/graphql";

// Create mock functions first (before vi.mock calls to avoid hoisting issues)
export const mockNavigate = vi.fn();
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// Mock react-router-dom (hoisted to top level)
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-hot-toast (hoisted to top level)
vi.mock("react-hot-toast", () => ({
  default: mockToast, // EditProfilePage uses default import
  toast: mockToast, // Backup for named import
  Toaster: () => React.createElement("div", { "data-testid": "toaster" }),
}));

// Mock ThemeProvider for testing
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <StyledThemeProvider theme={lightTheme}>{children}</StyledThemeProvider>
  );
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  mocks?: readonly MockedResponse[];
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  mocks = [],
}) => {
  return (
    // `addTypename` is deliberately left at its default (true). Turning it off
    // makes mocks that omit __typename fail *silently*: the query resolves,
    // nothing is logged, and the component renders as though the server
    // returned nothing. Keep __typename on your mock data instead --
    // `createMockUser` below does, and the generated types will tell you what
    // each shape needs.
    <MockedProvider mocks={mocks}>
      <BrowserRouter>
        <MockThemeProvider>
          {children}
          <div data-testid="toaster" />
        </MockThemeProvider>
      </BrowserRouter>
    </MockedProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  mocks?: readonly MockedResponse[];
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { mocks, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders mocks={mocks}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };

/**
 * The `me` shape exactly as ME_QUERY selects it. Typing the factory against
 * the generated query means a field the query adds later is a compile error
 * here rather than a missing-field warning at runtime.
 */
export type MockUser = MeQuery["me"];

export const createMockUser = (
  overrides: Partial<MockUser> = {},
): MockUser => ({
  __typename: "User",
  id: "1",
  username: "testuser",
  email: "test@example.com",
  displayName: "Test User",
  bio: null,
  website: null,
  dateOfBirth: null,
  isVerified: false,
  isAdmin: false,
  canCreateInviteCode: false,
  canListInviteCodes: false,
  canCreateCommunity: false,
  canGrantGlobalPermissions: false,
  canListUsers: false,
  privacySettings: null,
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
  avatarImage: null,
  communityMemberships: [],
  ...overrides,
});

/**
 * The `updateProfile` shape exactly as UPDATE_PROFILE selects it. Same
 * reasoning as createMockUser: let the generated type police the fields.
 */
export type MockUpdatedProfile = UpdateProfileMutation["updateProfile"];

export const createMockUpdatedProfile = (
  overrides: Partial<MockUpdatedProfile> = {},
): MockUpdatedProfile => ({
  __typename: "User",
  id: "1",
  username: "testuser",
  displayName: "Test User",
  bio: null,
  website: null,
  dateOfBirth: null,
  isVerified: false,
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
  avatarImage: null,
  ...overrides,
});
