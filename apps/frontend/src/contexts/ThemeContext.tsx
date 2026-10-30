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
import {
  migrateLegacyPreference,
  readLegacyPreference,
  readThemePreference,
  siteStorage,
  resolveThemeMode,
  writeThemePreference,
  type ThemeMode,
  type ThemePreference,
} from "../lib/themePreference";

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

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const systemPrefersDark = (): boolean =>
  window.matchMedia?.(SYSTEM_DARK_QUERY).matches ?? false;

/** A choice under the old localStorage key counts until it is migrated. */
const initialPreference = (): ThemePreference | null =>
  readThemePreference() ?? readLegacyPreference(siteStorage());

/**
 * The inline script in index.html has already put the theme on <html> before
 * the first paint; start from that rather than deciding a second time.
 */
const initialMode = (preference: ThemePreference | null): ThemeMode => {
  const applied = document.documentElement.dataset.theme;
  if (applied === "light" || applied === "dark") return applied;
  return resolveThemeMode(preference, systemPrefersDark());
};

const applyModeToDocument = (mode: ThemeMode, background: string) => {
  const html = document.documentElement;
  html.dataset.theme = mode;
  html.style.colorScheme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", background);
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference | null>(
    initialPreference,
  );
  const [mode, setMode] = useState<ThemeMode>(() => initialMode(preference));

  // Get current theme object
  const theme = mode === "dark" ? darkTheme : lightTheme;

  // Apply theme immediately to DOM elements to prevent flash
  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      applyModeToDocument(mode, theme.colors.background);

      // Temporarily disable transitions
      const bodyTransition = document.body.style.transition;
      document.body.style.transition = "none";

      const rootElement = document.getElementById("root");
      const rootTransition = rootElement?.style.transition;
      if (rootElement) {
        rootElement.style.transition = "none";
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
          rootElement.style.transition = rootTransition || "";
        }
      }, 50);
    }
  }, [mode, theme]);

  // Enable blanket transitions briefly during theme switch
  const enableThemeTransition = () => {
    document.documentElement.classList.add("theme-transitioning");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 350);
  };

  // Saved only here, when the user picks; mounting saves nothing, so a
  // visitor who never picks keeps following their system setting.
  const setTheme = (newMode: ThemeMode) => {
    enableThemeTransition();
    writeThemePreference(newMode);
    setPreference(newMode);
    setMode(newMode);
  };

  const toggleTheme = () => setTheme(mode === "light" ? "dark" : "light");

  useEffect(() => {
    migrateLegacyPreference(
      readThemePreference(),
      siteStorage(),
      writeThemePreference,
    );
  }, []);

  const followsSystem = preference === null || preference === "system";

  useEffect(() => {
    if (!followsSystem || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = (e: { matches: boolean }) =>
      setMode(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [followsSystem]);

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
