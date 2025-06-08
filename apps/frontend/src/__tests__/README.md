# Frontend Testing Setup

This directory contains the testing setup and utilities for the frontend package.

## Overview

We use **Vitest** as our test runner with **React Testing Library** for component testing. This provides a modern, fast testing environment that integrates well with our Vite build setup.

## Test Stack

- **Vitest**: Fast test runner with Vite integration
- **React Testing Library**: Component testing utilities
- **jsdom**: DOM environment for tests
- **@testing-library/jest-dom**: Extended matchers
- **@testing-library/user-event**: User interaction utilities
- **Apollo Client Testing**: GraphQL mocking utilities

## Configuration Files

- `vitest.config.ts`: Vitest configuration
- `setupTests.ts`: Global test setup and mocks
- `test-utils.tsx`: Custom render function with providers

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with UI
yarn test:ui

# Run tests with coverage
yarn test:coverage
```

## Test Utils

The `test-utils.tsx` file provides:

- Custom `render` function that wraps components with necessary providers
- Mock implementations for common dependencies
- Factory functions for creating mock data
- Provider mocks for Apollo Client, Router, Theme, and Auth

### Usage Example

```tsx
import { render, screen, createMockUser } from '../__tests__/test-utils';
import { MyComponent } from '../MyComponent';

test('renders component', () => {
  const mockUser = createMockUser({ displayName: 'Test User' });
  
  render(<MyComponent />, {
    user: mockUser,
    mocks: [/* GraphQL mocks */]
  });
  
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

## Mocking Strategy

### GraphQL
- Use `MockedProvider` from Apollo Client
- Create typed mock responses for queries and mutations
- Mock both success and error scenarios

### Router
- Mock `useNavigate` for navigation testing
- Use `BrowserRouter` in test provider

### Styling
- Use lightweight theme provider for styled-components
- Test accessibility and structure rather than specific styles

### External Dependencies
- Mock `react-hot-toast` for notification testing
- Mock browser APIs (localStorage, sessionStorage, etc.)

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what users can see and do
2. **Use Accessible Queries**: Prefer `getByRole`, `getByLabelText`, etc.
3. **Mock Thoughtfully**: Only mock what's necessary for the test
4. **Async Testing**: Use `waitFor` for asynchronous operations
5. **Descriptive Tests**: Write clear test descriptions and organize with `describe` blocks

## Writing Tests

### Component Structure Tests
```tsx
test('renders all form fields', () => {
  render(<EditProfilePage />, { mocks: [mockQuery] });
  
  expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
  expect(screen.getByLabelText('Bio')).toBeInTheDocument();
});
```

### User Interaction Tests
```tsx
test('submits form with valid data', async () => {
  const user = userEvent.setup();
  render(<EditProfilePage />, { mocks: [mockQuery, mockMutation] });
  
  await user.type(screen.getByLabelText('Display Name'), 'New Name');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  
  await waitFor(() => {
    expect(mockToast.success).toHaveBeenCalled();
  });
});
```

### Error State Tests
```tsx
test('shows error message on mutation failure', async () => {
  render(<EditProfilePage />, { 
    mocks: [mockQuery, mockMutationError] 
  });
  
  await waitFor(() => {
    expect(mockToast.error).toHaveBeenCalledWith('Failed to update profile');
  });
});
```

## File Organization

```
__tests__/
├── README.md          # This file
├── test-utils.tsx     # Testing utilities and providers
└── setupTests.ts      # Global test configuration

pages/
└── __tests__/
    └── EditProfilePage.test.tsx  # Example component test

components/
└── __tests__/
    └── ComponentName.test.tsx    # Component-specific tests
```

## Common Patterns

### Testing Forms
- Test validation errors
- Test submission success/failure
- Test disabled states
- Test field interactions

### Testing Authentication
- Test authenticated vs unauthenticated states
- Mock user data appropriately
- Test navigation based on auth state

### Testing GraphQL
- Mock loading states
- Mock success responses
- Mock error responses
- Test refetch behavior

This testing setup provides a solid foundation for writing reliable, maintainable tests for React components in our application.