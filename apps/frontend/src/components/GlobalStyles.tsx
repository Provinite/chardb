import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.colors.background} !important;
    color: ${({ theme }) => theme.colors.text.primary} !important;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #root {
    background-color: ${({ theme }) => theme.colors.background};
    transition: background-color 0.3s ease;
  }

  /* Ensure smooth transitions for theme changes */
  * {
    transition: 
      background-color 0.3s ease,
      color 0.3s ease,
      border-color 0.3s ease,
      box-shadow 0.3s ease;
  }

  /* Override any lingering styles that might not respect theme */
  input, textarea, select {
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border};
  }

  /* Scrollbar styling for dark mode */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.muted};
  }
`;