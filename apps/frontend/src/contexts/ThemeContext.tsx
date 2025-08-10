import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  ReactNode,
} from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { lightTheme, darkTheme, Theme } from "@chardb/ui";
import { GlobalStyles } from "../components/GlobalStyles";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "chardb-theme-mode";

// Get initial theme outside of React lifecycle
const getInitialTheme = (): ThemeMode => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    // Check system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "dark" : "light";
  }
  return "light";
};

const initialTheme = getInitialTheme();

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from pre-calculated value
  const [mode, setMode] = useState<ThemeMode>(initialTheme);

  // Get current theme object
  const theme = mode === "dark" ? darkTheme : lightTheme;

  // Apply theme immediately to DOM elements to prevent flash
  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      // Temporarily disable transitions
      const bodyTransition = document.body.style.transition;
      document.body.style.transition = 'none';
      
      const rootElement = document.getElementById('root');
      const rootTransition = rootElement?.style.transition;
      if (rootElement) {
        rootElement.style.transition = 'none';
      }
      
      // Apply theme colors
      document.body.style.backgroundColor = theme.colors.background;
      document.body.style.color = theme.colors.text.primary;
      
      if (rootElement) {
        rootElement.style.backgroundColor = theme.colors.background;
      }
      
      // Re-enable transitions after a brief delay
      setTimeout(() => {
        document.body.style.transition = bodyTransition;
        if (rootElement) {
          rootElement.style.transition = rootTransition || '';
        }
      }, 50);
    }
  }, [theme]);

  // Toggle between light and dark
  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
  };

  // Set specific theme
  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!storedTheme) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value: ThemeContextType = {
    mode,
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
