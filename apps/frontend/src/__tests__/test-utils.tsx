import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '@chardb/ui';
import { vi } from 'vitest';

// Create mock functions first (before vi.mock calls to avoid hoisting issues)
export const mockNavigate = vi.fn();
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// Mock react-router-dom (hoisted to top level)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-hot-toast (hoisted to top level)
vi.mock('react-hot-toast', () => ({
  default: mockToast, // EditProfilePage uses default import
  toast: mockToast, // Backup for named import
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}));

// Mock AuthContext for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockAuthProvider: React.FC<{ children: React.ReactNode; user?: any }> = ({
  children,
}) => {
  return <div data-testid="mock-auth-provider">{children}</div>;
};

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  initialEntries?: string[];
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  mocks = [],
  user,
}) => {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <MockThemeProvider>
          <MockAuthProvider user={user}>
            {children}
            <div data-testid="toaster" />
          </MockAuthProvider>
        </MockThemeProvider>
      </BrowserRouter>
    </MockedProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: readonly MockedResponse[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  initialEntries?: string[];
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { mocks, user, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders mocks={mocks} user={user}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Create mock user factory
export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  isVerified: false,
  isAdmin: false,
  bio: null,
  location: null,
  website: null,
  dateOfBirth: null,
  privacySettings: null,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});
